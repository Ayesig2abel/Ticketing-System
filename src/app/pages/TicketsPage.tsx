import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { Sidebar } from "../components/layout/Sidebar";
import { UserProfileChip } from "../components/layout/UserProfileChip";
import { supabase } from "../lib/supabase";
import { useTickets, type Ticket as TicketItem, type TicketStatus as Status, type TicketPriority as Priority, type TicketCategory as Category, type TicketComment, type AssignableAgent } from "../data/TicketsContext";
import { useSLA, getSLAStatus } from "../data/SLAContext";
import {
  Users, FileText, Paperclip, Send, MessageSquare,
  Search, Filter, Plus, MoreHorizontal, ArrowUpDown,
  CheckCircle2, Clock, AlertTriangle, XCircle, ArrowUp, X, ChevronLeft, ChevronRight as ChevronRightIcon, ChevronDown,
} from "lucide-react";

const ACCENT = "#5f63f2";

// ─── Config ──────────────────────────────────────────────────────────────────
const statusConfig: Record<Status, { color: string; bg: string; icon: React.ReactNode }> = {
  Open:      { color: "#3b82f6", bg: "#eff6ff", icon: <Clock size={11} /> },
  Pending:   { color: "#f59e0b", bg: "#fffbeb", icon: <Clock size={11} /> },
  Escalated: { color: "#ef4444", bg: "#fef2f2", icon: <AlertTriangle size={11} /> },
  Resolved:  { color: "#10b981", bg: "#ecfdf5", icon: <CheckCircle2 size={11} /> },
  Closed:    { color: "#6b7280", bg: "#f9fafb", icon: <XCircle size={11} /> },
};

const priorityConfig: Record<Priority, { color: string; bg: string }> = {
  Low:      { color: "#6b7280", bg: "#f3f4f6" },
  Medium:   { color: "#f59e0b", bg: "#fffbeb" },
  High:     { color: "#ef4444", bg: "#fef2f2" },
  Critical: { color: "#7c3aed", bg: "#f5f3ff" },
};

const statusTabs: (Status | "All")[] = ["All", "Open", "Pending", "Escalated", "Resolved", "Closed"];
const statuses: Status[] = ["Open", "Pending", "Escalated", "Resolved", "Closed"];

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function TicketModal({ ticket, onClose, onStatusChange, agentsList, isAdmin }: {
  ticket: TicketItem;
  onClose: () => void;
  onStatusChange: (id: string, status: Status) => void;
  agentsList: AssignableAgent[];
  isAdmin: boolean;
}) {
  const sc = statusConfig[ticket.status];
  const pc = priorityConfig[ticket.priority];
  const { addComment, assignTicket } = useTickets();
  const { user } = useAuth();
  const [replyText, setReplyText] = useState("");
  const [replyRole, setReplyRole] = useState<"agent" | "customer">("agent");
  const threadRef = useRef<HTMLDivElement>(null);

  const submitReply = () => {
    const text = replyText.trim();
    if (!text) return;
    addComment(ticket.id, {
      author: user?.name ?? "Agent",
      role: replyRole,
      text,
    });
    setReplyText("");
    setTimeout(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }, 30);
  };

  const handleAssignChange = (name: string) => {
    if (name === "Unassigned") {
      assignTicket(ticket.id, { name: "Unassigned", avatar: "UA", color: "#9ca3af" });
      return;
    }
    const chosen = agentsList.find((a) => a.name === name);
    if (chosen) assignTicket(ticket.id, chosen);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full mx-4 overflow-hidden flex flex-col" style={{ maxWidth: 640, maxHeight: "90vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-medium">{ticket.id}</p>
            <h3 className="text-sm font-bold text-[#1a1f5e] mt-0.5">{ticket.subject}</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Status + Assigned Agent row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 font-medium mb-1.5">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((s) => (
                  <button key={s} onClick={() => onStatusChange(ticket.id, s)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all"
                    style={{
                      background: ticket.status === s ? statusConfig[s].bg : "transparent",
                      color: ticket.status === s ? statusConfig[s].color : "#9ca3af",
                      borderColor: ticket.status === s ? statusConfig[s].color + "44" : "#e5e7eb",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assigned Agent — admin-only editable control */}
          <div>
            <p className="text-[10px] text-gray-400 font-medium mb-1.5">Assigned Agent</p>
            {isAdmin ? (
              <div className="relative">
                <select value={ticket.agent} onChange={(e) => handleAssignChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer pr-8">
                  <option value="Unassigned">Unassigned</option>
                  {agentsList.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0" style={{ background: ticket.agentColor }}>
                  {ticket.agentAvatar}
                </div>
                <span className="text-xs font-semibold text-[#1a1f5e]">{ticket.agent}</span>
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: "Customer", value: ticket.customer },
              { label: "Email", value: ticket.email },
              { label: "Category", value: [ticket.category, ticket.subcategory, ticket.subSubcategory].filter(Boolean).join(" › ") },
              { label: "Source", value: ticket.source },
              { label: "Created", value: ticket.created },
              { label: "Last Updated", value: ticket.updated },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                <p className="font-semibold text-[#1a1f5e]">{value}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Description</p>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
              {ticket.details?.trim() ? ticket.details : <span className="italic text-gray-400">No description was provided for this ticket.</span>}
            </div>
          </div>

          {/* Attachments */}
          {ticket.attachments && ticket.attachments.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Attachments ({ticket.attachments.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ticket.attachments.map((a) => (
                  <a key={a.id} href={a.dataUrl} download={a.name} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-100 rounded-lg px-2.5 py-2">
                    {a.type.startsWith("image/") ? (
                      <img src={a.dataUrl} alt={a.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <FileText size={14} className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[#1a1f5e] truncate">{a.name}</p>
                      <p className="text-[10px] text-gray-400">{(a.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Priority */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Priority:</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: pc.bg, color: pc.color }}>{ticket.priority}</span>
          </div>

          {/* Conversation thread */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                Conversation {(ticket.comments?.length ?? 0) > 0 && `(${ticket.comments!.length})`}
              </p>
            </div>

            <div ref={threadRef} className="space-y-3 max-h-60 overflow-y-auto mb-3 pr-1">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-gray-300" />
                <p className="text-xs text-gray-400">
                  Ticket created by <span className="font-medium text-gray-500">{ticket.customer}</span>
                  <span className="ml-2 text-gray-300">{ticket.created}</span>
                </p>
              </div>

              {(ticket.comments ?? []).map((c) => {
                const isAgent = c.role === "agent";
                return (
                  <div key={c.id} className={`flex gap-2 ${isAgent ? "flex-row-reverse" : "flex-row"}`}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ background: isAgent ? "#5f63f2" : "#f87171" }}>
                      {c.author.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] ${isAgent ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                      <div className="px-3 py-2 rounded-2xl text-xs leading-relaxed"
                        style={{
                          background: isAgent ? "#5f63f2" : "#f3f4f6",
                          color: isAgent ? "#fff" : "#1a1f5e",
                          borderBottomRightRadius: isAgent ? 4 : undefined,
                          borderBottomLeftRadius: !isAgent ? 4 : undefined,
                        }}>
                        {c.text}
                      </div>
                      <p className="text-[10px] text-gray-400 px-1">
                        {c.author} · {c.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}

              {(!ticket.comments || ticket.comments.length === 0) && (
                <div className="flex items-center gap-2 py-3 text-xs text-gray-400 italic">
                  <MessageSquare size={13} />
                  No replies yet — add one below to start the conversation.
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
                <span className="text-[10px] text-gray-400">Replying as:</span>
                <button
                  onClick={() => setReplyRole("agent")}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all"
                  style={{ background: replyRole === "agent" ? "#5f63f2" : "transparent", color: replyRole === "agent" ? "#fff" : "#6b7280" }}>
                  Agent
                </button>
                <button
                  onClick={() => setReplyRole("customer")}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all"
                  style={{ background: replyRole === "customer" ? "#f87171" : "transparent", color: replyRole === "customer" ? "#fff" : "#6b7280" }}>
                  Customer
                </button>
              </div>
              <div className="flex items-end gap-2 p-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitReply(); } }}
                  placeholder="Type a reply… (Enter to send, Shift+Enter for new line)"
                  rows={2}
                  className="flex-1 text-xs text-[#1a1f5e] placeholder-gray-400 outline-none resize-none bg-transparent leading-relaxed"
                />
                <button
                  onClick={submitReply}
                  disabled={!replyText.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-opacity"
                  style={{ background: replyRole === "agent" ? "#5f63f2" : "#f87171" }}>
                  <Send size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={() => { onStatusChange(ticket.id, "Resolved"); onClose(); }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#10b981" }}>
            Mark Resolved
          </button>
          <button onClick={() => { onStatusChange(ticket.id, "Escalated"); onClose(); }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#ef4444" }}>
            Escalate
          </button>
          <button onClick={() => { onStatusChange(ticket.id, "Closed"); onClose(); }}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 border border-gray-200 text-gray-600 bg-white">
            Close Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { tickets: allTickets, updateTicketStatus } = useTickets();

  // Customers only ever see their own tickets here — agents and admins
  // see the full system-wide ticket table.
  const tickets = user?.role === "customer"
    ? allTickets.filter((t) => t.email.toLowerCase() === user.email.toLowerCase())
    : allTickets;

  const { getResolutionHours, categories } = useSLA();
  const [activeTab, setActiveTab] = useState<Status | "All">("All");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [agentFilter, setAgentFilter] = useState("All");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const selectedTicket = selectedTicketId ? tickets.find((t) => t.id === selectedTicketId) ?? null : null;
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Real agent directory (name/avatar/color), replacing the old hardcoded
  // placeholder list — used for both the filter dropdown and the assign
  // control in the ticket modal.
  const [agentsList, setAgentsList] = useState<AssignableAgent[]>([]);
  useEffect(() => {
    const fetchAgents = async () => {
      const { data, error } = await supabase.from("agents").select("*");
      if (error) { console.error("Failed to load agents for ticket routing:", error); return; }
      setAgentsList((data ?? []).map((row: any) => ({
        name: row.name,
        avatar: row.avatar ?? row.name.slice(0, 2).toUpperCase(),
        color: row.color ?? "#5f63f2",
      })));
    };
    fetchAgents();
  }, []);

  const handleStatusChange = (id: string, status: Status) => {
    updateTicketStatus(id, status);
  };

  const filtered = tickets.filter((t) => {
    const matchTab = activeTab === "All" || t.status === activeTab;
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.customer.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "All" || t.category === categoryFilter;
    const matchPri = priorityFilter === "All" || t.priority === priorityFilter;
    const matchAgent = agentFilter === "All" || t.agent === agentFilter;
    return matchTab && matchSearch && matchCat && matchPri && matchAgent;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = statusTabs.reduce((acc, s) => {
    acc[s] = s === "All" ? tickets.length : tickets.filter((t) => t.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const tabColors: Record<string, string> = {
    All: ACCENT, Open: "#3b82f6", Pending: "#f59e0b",
    Escalated: "#ef4444", Resolved: "#10b981", Closed: "#6b7280",
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>

      <Sidebar active="tickets" />

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-[#1a1f5e]">{isAdmin || user?.role === "agent" ? "Ticket Management" : "My Tickets"}</h1>
            <p className="text-xs text-gray-400">{isAdmin || user?.role === "agent" ? "View and manage all support tickets" : "View your submitted tickets"}</p>
          </div>
          <div className="flex items-center gap-3">
            <UserProfileChip />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Escalated tickets banner — only shown when there are escalated tickets */}
          {counts["Escalated"] > 0 && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 flex items-start gap-3"
              style={{ borderColor: "#fca5a5", background: "#fff5f5" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: "#fef2f2" }}>
                <AlertTriangle size={15} style={{ color: "#ef4444" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "#b91c1c" }}>
                  {counts["Escalated"]} escalated ticket{counts["Escalated"] !== 1 ? "s" : ""} need urgent attention
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {tickets
                    .filter((t) => t.status === "Escalated")
                    .slice(0, 5)
                    .map((t) => (
                      <button key={t.id} onClick={() => setSelectedTicketId(t.id)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors hover:bg-red-100"
                        style={{ borderColor: "#fca5a5", color: "#b91c1c", background: "#fff" }}>
                        <span style={{ color: "#ef4444" }}>{t.id}</span>
                        <span className="text-gray-500 font-normal truncate max-w-[140px]">{t.subject}</span>
                        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                          style={{ background: priorityConfig[t.priority].bg, color: priorityConfig[t.priority].color }}>
                          {t.priority}
                        </span>
                      </button>
                    ))}
                  {counts["Escalated"] > 5 && (
                    <button onClick={() => { setActiveTab("Escalated"); setPage(1); }}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      style={{ color: "#ef4444" }}>
                      +{counts["Escalated"] - 5} more → View all
                    </button>
                  )}
                </div>
              </div>
              <button onClick={() => { setActiveTab("Escalated"); setPage(1); }}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                style={{ background: "#ef4444" }}>
                View all escalated
              </button>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-5 gap-3">
            {(["Open", "Pending", "Escalated", "Resolved", "Closed"] as Status[]).map((s) => {
              const c = statusConfig[s];
              return (
                <button key={s} onClick={() => { setActiveTab(s); setPage(1); }}
                  className="bg-white rounded-xl p-4 text-left shadow-sm hover:shadow-md transition-shadow border-2"
                  style={{ borderColor: activeTab === s ? c.color : "transparent" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: c.bg }}>
                      <span style={{ color: c.color }}>{c.icon}</span>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>{s}</span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: c.color }}>{counts[s]}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Total tickets</p>
                </button>
              );
            })}
          </div>

          {/* Table card */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Filters bar */}
            <div className="px-5 pt-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Search */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 flex-1 min-w-48">
                  <Search size={13} className="text-gray-400 flex-shrink-0" />
                  <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="Search tickets, customers..."
                    className="bg-transparent text-xs outline-none w-full text-gray-600 placeholder-gray-400" />
                </div>

                {/* Category filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                  <Filter size={12} className="text-gray-400" />
                  <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                    className="bg-transparent text-xs text-gray-600 outline-none cursor-pointer">
                    <option value="All">All Categories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Priority filter */}
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                  <ArrowUp size={12} className="text-gray-400" />
                  <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                    className="bg-transparent text-xs text-gray-600 outline-none cursor-pointer">
                    <option value="All">All Priorities</option>
                    {["Low", "Medium", "High", "Critical"].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {/* Agent filter — hidden for customers, they only see their own tickets */}
                {user?.role !== "customer" && (
                  <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                    <Users size={12} className="text-gray-400" />
                    <select value={agentFilter} onChange={(e) => { setAgentFilter(e.target.value); setPage(1); }}
                      className="bg-transparent text-xs text-gray-600 outline-none cursor-pointer">
                      <option value="All">All Agents</option>
                      {agentsList.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                    </select>
                  </div>
                )}

                {/* New ticket */}
                <button onClick={() => navigate("/raise-ticket")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white ml-auto"
                  style={{ background: ACCENT }}>
                  <Plus size={13} />New Ticket
                </button>
              </div>

              {/* Status tabs */}
              <div className="flex gap-1 mt-3">
                {statusTabs.map((tab) => (
                  <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: activeTab === tab ? tabColors[tab] + "18" : "transparent",
                      color: activeTab === tab ? tabColors[tab] : "#9ca3af",
                      borderBottom: activeTab === tab ? `2px solid ${tabColors[tab]}` : "2px solid transparent",
                    }}>
                    {tab}
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: activeTab === tab ? tabColors[tab] : "#f3f4f6", color: activeTab === tab ? "#fff" : "#9ca3af" }}>
                      {counts[tab]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Ticket ID", "Source", "Subject", "Customer", "Agent", "Category", "Priority", "Status", "SLA", "Updated", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide whitespace-nowrap">
                        <div className="flex items-center gap-1">{h}
                          {["Ticket ID", "Updated"].includes(h) && <ArrowUpDown size={10} className="text-gray-300" />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-12 text-gray-400 text-sm">No tickets found</td></tr>
                  )}
                  {paginated.map((ticket) => {
                    const sc = statusConfig[ticket.status];
                    const pc = priorityConfig[ticket.priority];
                    const isClosed = ticket.status === "Closed" || ticket.status === "Resolved";
                    const sla = getSLAStatus(ticket.created, ticket.priority, isClosed, getResolutionHours(ticket.priority));
                    return (
                      <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                        <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: ACCENT }}>{ticket.id}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ticket.source === "WhatsApp" ? (
                            <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: "#dcfce7", color: "#16a34a" }}>WhatsApp</span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500">Web</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-[180px]">
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-[#1a1f5e] truncate">{ticket.subject}</p>
                            {ticket.attachments && ticket.attachments.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-gray-400 flex-shrink-0">
                                <Paperclip size={10} />{ticket.attachments.length}
                              </span>
                            )}
                            {ticket.comments && ticket.comments.length > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-gray-400 flex-shrink-0">
                                <MessageSquare size={10} />{ticket.comments.length}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-400 text-[10px] truncate">{ticket.email}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                              style={{ background: ACCENT }}>
                              {ticket.customer.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span className="font-medium text-[#1a1f5e]">{ticket.customer}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                              style={{ background: ticket.agentColor }}>
                              {ticket.agentAvatar}
                            </div>
                            <span className="text-gray-600">{ticket.agent}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-gray-500">
                            {ticket.category}
                            {ticket.subcategory && <span className="text-gray-300"> › {ticket.subcategory}</span>}
                            {ticket.subSubcategory && <span className="text-gray-300"> › {ticket.subSubcategory}</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-full text-[10px] font-semibold"
                            style={{ background: pc.bg, color: pc.color }}>{ticket.priority}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold w-fit"
                            style={{ background: sc.bg, color: sc.color }}>
                            {sc.icon}{ticket.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isClosed ? (
                            <span className="text-[10px] text-gray-400">—</span>
                          ) : sla.breached ? (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold w-fit" style={{ background: "#fef2f2", color: "#ef4444" }}>
                              <AlertTriangle size={10} /> Breached
                            </span>
                          ) : sla.hoursRemaining < 4 ? (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold w-fit" style={{ background: "#fffbeb", color: "#f59e0b" }}>
                              <Clock size={10} /> {Math.max(0, Math.round(sla.hoursRemaining))}h left
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold w-fit" style={{ background: "#ecfdf5", color: "#10b981" }}>
                              <CheckCircle2 size={10} /> On Track
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-400">{ticket.updated}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setSelectedTicketId(ticket.id)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
                              style={{ background: ACCENT }}>View</button>
                            {(isAdmin || user?.role === "agent") && (
                              <>
                                <button onClick={() => handleStatusChange(ticket.id, "Resolved")}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
                                  style={{ background: "#10b981" }}>Resolve</button>
                                <button onClick={() => handleStatusChange(ticket.id, "Escalated")}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white transition-opacity hover:opacity-90"
                                  style={{ background: "#ef4444" }}>Escalate</button>
                              </>
                            )}
                          </div>
                          <button onClick={() => setSelectedTicketId(ticket.id)}
                            className="opacity-100 group-hover:opacity-0 transition-opacity text-gray-400 hover:text-gray-600 absolute">
                            <MoreHorizontal size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-[10px] text-gray-400">
                Showing <span className="font-semibold text-[#1a1f5e]">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-semibold text-[#1a1f5e]">{filtered.length}</span> tickets
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 hover:bg-white disabled:opacity-40 transition-colors">
                  <ChevronLeft size={13} />
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className="w-7 h-7 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: page === i + 1 ? ACCENT : "transparent",
                      color: page === i + 1 ? "#fff" : "#6b7280",
                    }}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="w-7 h-7 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 hover:bg-white disabled:opacity-40 transition-colors">
                  <ChevronRightIcon size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicketId(null)}
          onStatusChange={handleStatusChange}
          agentsList={agentsList}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}