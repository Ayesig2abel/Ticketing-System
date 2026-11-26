import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "../lib/supabase";

export type TicketStatus = "Open" | "Pending" | "Resolved" | "Closed" | "Escalated";
export type TicketPriority = "Low" | "Medium" | "High" | "Critical";
export type TicketCategory = string;
export type TicketSource = "Web" | "WhatsApp";

export interface TicketAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
}

export interface TicketComment {
  id: string;
  author: string;
  role: "agent" | "customer";
  text: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  subject: string;
  details?: string;
  customer: string;
  email: string;
  agent: string;
  agentAvatar: string;
  agentColor: string;
  category: TicketCategory;
  subcategory?: string;
  subSubcategory?: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  attachments?: TicketAttachment[];
  comments?: TicketComment[];
  created: string;
  updated: string;
}

export interface AssignableAgent {
  name: string;
  avatar: string;
  color: string;
}

interface TicketsContextValue {
  tickets: Ticket[];
  isLoading: boolean;
  addTicket: (
    input: Pick<Ticket, "subject" | "details" | "customer" | "email" | "category" | "priority"> &
      Partial<Pick<Ticket, "source" | "subcategory" | "subSubcategory" | "attachments">>
  ) => Promise<Ticket>;
  updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
  addComment: (ticketId: string, comment: Omit<TicketComment, "id" | "timestamp">) => Promise<void>;
  assignTicket: (id: string, agent: AssignableAgent) => Promise<void>;
}

const TicketsContext = createContext<TicketsContextValue | undefined>(undefined);

function todayDisplay() {
  return new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// Ticket numbers are NOT generated here any more. The database assigns them
// from the `ticket_number_seq` sequence (see the default on tickets.id), so
// numbers are sequential and two tickets created at the same moment can never
// collide. addTicket reads the assigned id back from the insert result.

// Maps Supabase snake_case rows → our camelCase Ticket shape
function rowToTicket(row: Record<string, unknown>, comments: TicketComment[] = [], attachments: TicketAttachment[] = []): Ticket {
  return {
    id: row.id as string,
    subject: row.subject as string,
    details: (row.details as string) ?? undefined,
    customer: row.customer as string,
    email: row.email as string,
    agent: row.agent as string,
    agentAvatar: row.agent_avatar as string,
    agentColor: row.agent_color as string,
    category: row.category as string,
    subcategory: (row.subcategory as string) ?? undefined,
    subSubcategory: (row.sub_subcategory as string) ?? undefined,
    status: row.status as TicketStatus,
    priority: row.priority as TicketPriority,
    source: (row.source as TicketSource) ?? "Web",
    created: new Date(row.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    updated: new Date(row.updated_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    comments,
    attachments,
  };
}

function rowToComment(row: Record<string, unknown>): TicketComment {
  return {
    id: row.id as string,
    author: row.author as string,
    role: row.role as "agent" | "customer",
    text: row.text as string,
    timestamp: new Date(row.created_at as string).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    }),
  };
}

function rowToAttachment(row: Record<string, unknown>): TicketAttachment {
  return {
    id: row.id as string,
    name: row.name as string,
    size: row.size as number,
    type: row.type as string,
    dataUrl: row.data_url as string,
  };
}

// Picks the best agent for a newly-created ticket's category: among Active
// agents whose "category" field matches, the one with the fewest currently
// open tickets gets it (simple load-balancing). Returns null if no agent
// covers this category, in which case the ticket stays "Unassigned" and an
// admin can assign it manually.
async function pickAgentForCategory(category: string, currentTickets: Ticket[]): Promise<AssignableAgent | null> {
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .ilike("category", `%${category}%`)
    .eq("status", "Active");

  if (error || !data || data.length === 0) return null;

  const openCountByAgent = new Map<string, number>();
  currentTickets.forEach((t) => {
    if (t.status !== "Closed" && t.status !== "Resolved") {
      openCountByAgent.set(t.agent, (openCountByAgent.get(t.agent) ?? 0) + 1);
    }
  });

  let best = data[0];
  let bestCount = openCountByAgent.get(best.name) ?? 0;
  for (const candidate of data) {
    const count = openCountByAgent.get(candidate.name) ?? 0;
    if (count < bestCount) {
      best = candidate;
      bestCount = count;
    }
  }

  return {
    name: best.name,
    avatar: best.avatar ?? best.name.slice(0, 2).toUpperCase(),
    color: best.color ?? "#5f63f2",
  };
}

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all tickets with their comments and attachments on mount
  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ticketsRes, commentsRes, attachmentsRes] = await Promise.all([
        supabase.from("tickets").select("*").order("created_at", { ascending: false }),
        supabase.from("ticket_comments").select("*").order("created_at", { ascending: true }),
        supabase.from("ticket_attachments").select("*"),
      ]);

      if (ticketsRes.error) throw ticketsRes.error;

      const commentsByTicket: Record<string, TicketComment[]> = {};
      (commentsRes.data ?? []).forEach((row) => {
        const tid = row.ticket_id as string;
        if (!commentsByTicket[tid]) commentsByTicket[tid] = [];
        commentsByTicket[tid].push(rowToComment(row));
      });

      const attachmentsByTicket: Record<string, TicketAttachment[]> = {};
      (attachmentsRes.data ?? []).forEach((row) => {
        const tid = row.ticket_id as string;
        if (!attachmentsByTicket[tid]) attachmentsByTicket[tid] = [];
        attachmentsByTicket[tid].push(rowToAttachment(row));
      });

      setTickets(
        (ticketsRes.data ?? []).map((row) =>
          rowToTicket(row, commentsByTicket[row.id] ?? [], attachmentsByTicket[row.id] ?? [])
        )
      );
    } catch (err) {
      console.error("Failed to load tickets:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();

    // Realtime subscription — new/updated tickets appear automatically
    const channel = supabase
      .channel("tickets-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        fetchTickets();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_comments" }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchTickets]);

  const addTicket: TicketsContextValue["addTicket"] = async (input) => {
    const now = new Date().toISOString();

    // Category-based auto-routing: try to hand this straight to whichever
    // Active agent already covers this category, balanced by current
    // open-ticket load. Falls back to "Unassigned" if nobody covers it —
    // an admin can still assign it manually from the ticket detail view.
    const matchedAgent = await pickAgentForCategory(input.category, tickets);

    // No `id` here — the database fills it in from ticket_number_seq.
    const row = {
      subject: input.subject,
      details: input.details ?? null,
      customer: input.customer,
      email: input.email,
      agent: matchedAgent?.name ?? "Unassigned",
      agent_avatar: matchedAgent?.avatar ?? "UA",
      agent_color: matchedAgent?.color ?? "#9ca3af",
      category: input.category,
      subcategory: input.subcategory ?? null,
      sub_subcategory: input.subSubcategory ?? null,
      status: "Open",
      priority: input.priority,
      source: input.source ?? "Web",
      created_at: now,
      updated_at: now,
    };

    // .select().single() returns the saved row, including the new ticket number
    const { data: saved, error } = await supabase
      .from("tickets")
      .insert(row)
      .select()
      .single();
    if (error) throw error;

    const id = saved.id as string;

    // Save attachments if any, linked to the number the database assigned
    if (input.attachments && input.attachments.length > 0) {
      const attachmentRows = input.attachments.map((a) => ({
        id: a.id,
        ticket_id: id,
        name: a.name,
        size: a.size,
        type: a.type,
        data_url: a.dataUrl,
      }));
      const { error: attachError } = await supabase.from("ticket_attachments").insert(attachmentRows);
      if (attachError) console.error("Failed to save attachments:", attachError);
    }

    const newTicket = rowToTicket(saved, [], input.attachments ?? []);
    setTickets((prev) => [newTicket, ...prev.filter((t) => t.id !== id)]);
    return newTicket;
  };

  const updateTicketStatus: TicketsContextValue["updateTicketStatus"] = async (id, status) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("tickets")
      .update({ status, updated_at: now })
      .eq("id", id);
    if (error) throw error;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status, updated: todayDisplay() } : t
      )
    );
  };

  const addComment: TicketsContextValue["addComment"] = async (ticketId, comment) => {
    const now = new Date().toISOString();
    const id = `cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const { error } = await supabase.from("ticket_comments").insert({
      id,
      ticket_id: ticketId,
      author: comment.author,
      role: comment.role,
      text: comment.text,
      created_at: now,
    });
    if (error) throw error;

    const newComment: TicketComment = {
      id,
      author: comment.author,
      role: comment.role,
      text: comment.text,
      timestamp: new Date(now).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }),
    };

    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, comments: [...(t.comments ?? []), newComment], updated: todayDisplay() }
          : t
      )
    );
  };

  // Manual (re)assignment — used by the admin-only "Assigned Agent" control
  // in the ticket detail modal. Overrides whatever auto-routing set at
  // creation time, or fills in an agent for tickets that came in Unassigned.
  const assignTicket: TicketsContextValue["assignTicket"] = async (id, agent) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("tickets")
      .update({
        agent: agent.name,
        agent_avatar: agent.avatar,
        agent_color: agent.color,
        updated_at: now,
      })
      .eq("id", id);
    if (error) throw error;

    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, agent: agent.name, agentAvatar: agent.avatar, agentColor: agent.color, updated: todayDisplay() }
          : t
      )
    );
  };

  return (
    <TicketsContext.Provider value={{ tickets, isLoading, addTicket, updateTicketStatus, addComment, assignTicket }}>
      {children}
    </TicketsContext.Provider>
  );
}

export function useTickets() {
  const ctx = useContext(TicketsContext);
  if (!ctx) throw new Error("useTickets must be used within a TicketsProvider");
  return ctx;
}
