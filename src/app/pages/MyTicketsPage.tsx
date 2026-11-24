import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useTickets, type Ticket as TicketRecord, type TicketStatus as Status, type TicketPriority as Priority, type TicketCategory as Category, type TicketAttachment } from "../data/TicketsContext";
import { useSLA } from "../data/SLAContext";
import { Sidebar } from "../components/layout/Sidebar";
import { UserProfileChip } from "../components/layout/UserProfileChip";
import { AttachmentPicker } from "../components/AttachmentPicker";
import {
  Ticket, FileText,
  ArrowLeft, Lock, CheckCircle2, Clock, AlertTriangle,
  XCircle, Search, X, ChevronDown,
} from "lucide-react";

const ACCENT = "#5f63f2";

const priorities: Priority[] = ["Low", "Medium", "High", "Critical"];

const priorityColors: Record<Priority, { color: string; bg: string }> = {
  Low:      { color: "#6b7280", bg: "#f3f4f6" },
  Medium:   { color: "#f59e0b", bg: "#fffbeb" },
  High:     { color: "#ef4444", bg: "#fef2f2" },
  Critical: { color: "#7c3aed", bg: "#f5f3ff" },
};

const statusConfig: Record<Status, { color: string; bg: string; icon: React.ReactNode }> = {
  Open:      { color: "#3b82f6", bg: "#eff6ff", icon: <Clock size={11} /> },
  Pending:   { color: "#f59e0b", bg: "#fffbeb", icon: <Clock size={11} /> },
  Escalated: { color: "#ef4444", bg: "#fef2f2", icon: <AlertTriangle size={11} /> },
  Resolved:  { color: "#10b981", bg: "#ecfdf5", icon: <CheckCircle2 size={11} /> },
  Closed:    { color: "#6b7280", bg: "#f9fafb", icon: <XCircle size={11} /> },
};

// ─── Shared badges ─────────────────────────────────────────────────────────────
function Badge({ text, variant }: { text: string; variant: "required" | "optional" }) {
  return (
    <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
      style={variant === "required"
        ? { background: "#fef2f2", color: "#ef4444" }
        : { background: "#f0f9ff", color: "#0ea5e9" }}>
      {text}
    </span>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="flex items-center text-xs font-semibold text-gray-600 mb-1.5">
      {label}
      <Badge text={required ? "required" : "optional"} variant={required ? "required" : "optional"} />
    </label>
  );
}

function LockedInput({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="flex items-center text-xs font-semibold text-gray-400 mb-1.5">
        {label}
        <span className="ml-1.5 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ background: "#f3f4f6", color: "#6b7280" }}>
          <Lock size={8} /> locked
        </span>
      </label>
      <div className="flex items-center gap-2 w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 cursor-not-allowed">
        <span className="flex-1 text-sm text-gray-400 select-none">{value}</span>
        <Lock size={12} className="text-gray-300 flex-shrink-0" />
      </div>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ ticket, onClose }: { ticket: TicketRecord; onClose: () => void }) {
  const sc = statusConfig[ticket.status];
  const pc = priorityColors[ticket.priority];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">{ticket.id}</p>
            <h3 className="text-sm font-bold text-[#1a1f5e]">{ticket.subject}</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={15} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              ["Category", [ticket.category, ticket.subcategory, ticket.subSubcategory].filter(Boolean).join(" › ")],
              ["Priority", ticket.priority],
              ["Status", ticket.status],
              ["Created", ticket.created],
              ["Updated", ticket.updated],
            ].map(([l, v]) => (
              <div key={l} className="bg-gray-50 rounded-lg px-3 py-2.5">
                <p className="text-[10px] text-gray-400 mb-0.5">{l}</p>
                {l === "Status"
                  ? <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: sc.color }}>{sc.icon}{v}</span>
                  : l === "Priority"
                  ? <span className="text-[11px] font-semibold" style={{ color: pc.color }}>{v}</span>
                  : <p className="font-semibold text-[#1a1f5e]">{v}</p>
                }
              </div>
            ))}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Description</p>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
              {ticket.details?.trim() ? ticket.details : <span className="italic text-gray-400">No description was provided for this ticket.</span>}
            </div>
          </div>

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
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="w-full py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MyTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [category, setCategory] = useState<Category | "">("");
  const [subcategory, setSubcategory] = useState("");
  const [subSubcategory, setSubSubcategory] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [employerId, setEmployerId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [newTicketId, setNewTicketId] = useState("");

  // History state — filtered from the shared ticket store to just this user's own tickets.
  const { tickets: allTickets, addTicket } = useTickets();
  const { categories, categoryDefaults, categoryTree } = useSLA();
  const selectedCategoryNode = categoryTree.find((c) => c.name === category);
  const availableSubcategories = selectedCategoryNode?.subcategories ?? [];
  const selectedSubcategoryNode = availableSubcategories.find((s) => s.name === subcategory);
  const availableItems = selectedSubcategoryNode?.items ?? [];
  const tickets = user ? allTickets.filter((t) => t.email.toLowerCase() === user.email.toLowerCase()) : [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!category) e.category = "Category is required";
    if (!subject.trim()) e.subject = "Subject is required";
    if (!details.trim()) e.details = "Details are required";
    return e;
  };

const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  const errs = validate();
  if (Object.keys(errs).length) { setErrors(errs); return; }
  const newTicket = await addTicket({
    subject,
    details,
    category: category as Category,
    subcategory: subcategory || undefined,
    subSubcategory: subSubcategory || undefined,
    priority,
    customer: user?.name ?? "Unknown",
    email: user?.email ?? "",
    attachments,
  });
  setNewTicketId(newTicket.id);
  setSubmitted(true);

  // Reset the form so the next submission starts blank instead of
  // carrying over the previous ticket's values.
  setCategory("");
  setSubcategory("");
  setSubSubcategory("");
  setPriority("Medium");
  setSubject("");
  setDetails("");
  setAttachments([]);
  setEmployerId("");
  setErrors({});
};
  const filteredTickets = tickets.filter(t => {
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = (["All", "Open", "Pending", "Escalated", "Resolved", "Closed"] as (Status | "All")[]).reduce((a, s) => {
    a[s] = s === "All" ? tickets.length : tickets.filter(t => t.status === s).length;
    return a;
  }, {} as Record<string, number>);

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>
      <Sidebar active="my-tickets" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/tickets")} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-base font-bold text-[#1a1f5e]">My Ticket</h1>
              <p className="text-xs text-gray-400">Submit a ticket or view your history</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <UserProfileChip />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Submitter banner ── */}
          <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border" style={{ background: "#f5f3ff", borderColor: ACCENT + "30" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: ACCENT }}>
              {user ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
            </div>
            <div>
              <p className="text-xs text-gray-500">You are submitting this ticket as</p>
              <p className="text-sm font-bold text-[#1a1f5e]">{user?.name ?? "Guest"} <span className="text-xs font-normal text-gray-400">·</span> <span className="text-xs text-gray-500">{user?.email ?? ""}</span></p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "#ecfdf5", color: "#10b981" }}>
              <CheckCircle2 size={12} /> Verified Session
            </div>
          </div>

          {/* ── Success banner (inline, not a full screen) ── */}
          {submitted && (
            <div className="flex items-center gap-3 px-5 py-4 rounded-2xl" style={{ background: "#ecfdf5", border: "1px solid #6ee7b750" }}>
              <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-700">Ticket submitted successfully!</p>
                <p className="text-xs text-emerald-600">Your ticket <span className="font-bold">{newTicketId}</span> is now open. You can track it below.</p>
              </div>
              <button onClick={() => setSubmitted(false)} className="text-emerald-400 hover:text-emerald-600"><X size={15} /></button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-5">

            {/* ── Form ── */}
            <div className="col-span-2">
              <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f5f3ff" }}>
                    <Ticket size={14} style={{ color: ACCENT }} />
                  </div>
                  <h2 className="text-sm font-bold text-[#1a1f5e]">Submit a New Ticket</h2>
                </div>

                {/* Locked identity fields */}
                <div className="grid grid-cols-2 gap-4">
                  <LockedInput label="Full Name" value={user?.name ?? "—"} />
                  <LockedInput label="Email Address" value={user?.email ?? "—"} />
                </div>

                {/* Employer ID — optional, editable */}
                <div>
                  <FieldLabel label="Employer ID" required={false} />
                  <input value={employerId} onChange={e => setEmployerId(e.target.value)}
                    placeholder="Your employer ID (optional)"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-[#1a1f5e] placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
                </div>

                {/* Category */}
                <div>
                  <FieldLabel label="Category" required />
                  <div className="relative">
                    <select value={category} onChange={e => {
                      const newCategory = e.target.value as Category;
                      setCategory(newCategory);
                      setSubcategory("");
                      setSubSubcategory("");
                      setErrors(er => ({ ...er, category: "" }));
                      if (newCategory && categoryDefaults[newCategory]) setPriority(categoryDefaults[newCategory]);
                    }}
                      className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all pr-8 ${errors.category ? "border-red-300" : "border-gray-200"}`}>
                      <option value="">Select a category</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.category && <p className="text-[11px] text-red-500 mt-1">{errors.category}</p>}
                </div>

                {/* Subcategory — only shown if the chosen category has any */}
                {availableSubcategories.length > 0 && (
                  <div>
                    <FieldLabel label="Subcategory" required={false} />
                    <div className="relative">
                      <select value={subcategory} onChange={e => { setSubcategory(e.target.value); setSubSubcategory(""); }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all pr-8">
                        <option value="">None</option>
                        {availableSubcategories.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Sub-subcategory — only shown if the chosen subcategory has any items */}
                {availableItems.length > 0 && (
                  <div>
                    <FieldLabel label={subcategory || "Item"} required={false} />
                    <div className="relative">
                      <select value={subSubcategory} onChange={e => setSubSubcategory(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all pr-8">
                        <option value="">None</option>
                        {availableItems.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <FieldLabel label="Subject" required />
                  <input value={subject} onChange={e => { setSubject(e.target.value); setErrors(er => ({ ...er, subject: "" })); }}
                    placeholder="Brief description of the issue"
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-[#1a1f5e] placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all ${errors.subject ? "border-red-300" : "border-gray-200"}`} />
                  {errors.subject && <p className="text-[11px] text-red-500 mt-1">{errors.subject}</p>}
                </div>

                {/* Details */}
                <div>
                  <FieldLabel label="Details" required />
                  <textarea value={details} onChange={e => { setDetails(e.target.value); setErrors(er => ({ ...er, details: "" })); }}
                    rows={4} placeholder="Describe the issue — what happened, when, and what you expected..."
                    className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-[#1a1f5e] placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none ${errors.details ? "border-red-300" : "border-gray-200"}`} />
                  {errors.details && <p className="text-[11px] text-red-500 mt-1">{errors.details}</p>}
                </div>

                {/* Attachments */}
                <div>
                  <FieldLabel label="Attachments" required={false} />
                  <AttachmentPicker attachments={attachments} onChange={setAttachments} />
                </div>

                <button type="submit" className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity mt-2" style={{ background: ACCENT }}>
                  Submit Ticket
                </button>
              </form>
            </div>

            {/* ── Right: priority picker ── */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <FieldLabel label="Priority" required />
                <div className="space-y-2 mt-1">
                  {priorities.map(p => {
                    const pc = priorityColors[p];
                    const active = priority === p;
                    return (
                      <button key={p} type="button" onClick={() => setPriority(p)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                        style={{ borderColor: active ? pc.color : "transparent", background: active ? pc.bg : "#f9fafb" }}>
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: pc.color }} />
                        <span className="text-xs font-semibold" style={{ color: active ? pc.color : "#374151" }}>{p}</span>
                        {active && <CheckCircle2 size={13} className="ml-auto" style={{ color: pc.color }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Counts */}
              <div className="bg-white rounded-2xl shadow-sm p-5 space-y-2">
                <p className="text-xs font-bold text-[#1a1f5e] mb-3">My Ticket Summary</p>
                {(["Open", "Pending", "Escalated", "Resolved"] as Status[]).map(s => {
                  const sc = statusConfig[s];
                  return (
                    <div key={s} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs text-gray-500" style={{ color: sc.color }}>{sc.icon}{s}</span>
                      <span className="text-xs font-bold" style={{ color: sc.color }}>{counts[s]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Ticket History ── */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center gap-3">
              <h3 className="text-sm font-bold text-[#1a1f5e]">My Ticket History</h3>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100 ml-auto">
                <Search size={12} className="text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                  className="bg-transparent text-xs outline-none w-32 text-gray-600 placeholder-gray-400" />
              </div>
              <div className="flex gap-1">
                {(["All", "Open", "Pending", "Resolved", "Closed"] as (Status | "All")[]).map(tab => {
                  const color = tab === "All" ? ACCENT : statusConfig[tab as Status]?.color ?? ACCENT;
                  return (
                    <button key={tab} onClick={() => setStatusFilter(tab)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all"
                      style={{ background: statusFilter === tab ? color + "18" : "transparent", color: statusFilter === tab ? color : "#9ca3af" }}>
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Ticket ID", "Subject", "Category", "Priority", "Status", "Updated", ""].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTickets.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400 text-sm">No tickets found</td></tr>
                )}
                {filteredTickets.map(t => {
                  const sc = statusConfig[t.status];
                  const pc = priorityColors[t.priority];
                  return (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: ACCENT }}>{t.id}</td>
                      <td className="px-4 py-3 max-w-[220px]"><p className="font-medium text-[#1a1f5e] truncate">{t.subject}</p></td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{t.category}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: pc.bg, color: pc.color }}>{t.priority}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap"><span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold w-fit" style={{ background: sc.bg, color: sc.color }}>{sc.icon}{t.status}</span></td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{t.updated}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedTicket(t)} className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white" style={{ background: ACCENT }}>View</button>
                      </td>c
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedTicket && <DetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />}
    </div>
  );
}
