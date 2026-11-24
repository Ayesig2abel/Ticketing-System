import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { useTickets, type TicketAttachment } from "../data/TicketsContext";
import { useSLA } from "../data/SLAContext";
import { supabase } from "../lib/supabase";
import { Sidebar } from "../components/layout/Sidebar";
import { UserProfileChip } from "../components/layout/UserProfileChip";
import { AttachmentPicker } from "../components/AttachmentPicker";
import {
  Ticket, ChevronDown,
  UserCircle, ArrowLeft, Search, Lock, CheckCircle2, X, Loader2,
} from "lucide-react";

const ACCENT = "#5f63f2";

// ─── Real user type, pulled from profiles table (role = 'customer') ─────────
type DirectoryUser = {
  id: string;
  name: string;
  email: string;
  employerId: string;
  role: string;
  avatar: string;
  color: string;
};

const AVATAR_COLORS = ["#f87171", "#fbbf24", "#c084fc", "#fb923c", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#2dd4bf", "#facc15"];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsFor(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "??";
}

type Priority = "Low" | "Medium" | "High" | "Critical";
type Category = string;

const priorities: Priority[] = ["Low", "Medium", "High", "Critical"];

const priorityColors: Record<Priority, { color: string; bg: string }> = {
  Low:      { color: "#6b7280", bg: "#f3f4f6" },
  Medium:   { color: "#f59e0b", bg: "#fffbeb" },
  High:     { color: "#ef4444", bg: "#fef2f2" },
  Critical: { color: "#7c3aed", bg: "#f5f3ff" },
};

// ─── Shared sub-components ─────────────────────────────────────────────────────
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

function LockedInput({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div>
      <label className="flex items-center text-xs font-semibold text-gray-400 mb-1.5">
        {label}
        <span className="ml-1.5 flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ background: "#f3f4f6", color: "#6b7280" }}>
          <Lock size={8} /> locked
        </span>
      </label>
      <div className="flex items-center gap-2 w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 cursor-not-allowed">
        {Icon && <Icon size={14} className="text-gray-300 flex-shrink-0" />}
        <span className="text-sm text-gray-400 select-none">{value}</span>
        <Lock size={12} className="ml-auto text-gray-300 flex-shrink-0" />
      </div>
    </div>
  );
}

// ─── Success overlay ──────────────────────────────────────────────────────────
function SuccessScreen({ ticketId, userName, onAnother, onView }: { ticketId: string; userName: string; onAnother: () => void; onView: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm p-12 max-w-md w-full text-center mx-6">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "#ecfdf5" }}>
          <CheckCircle2 size={36} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-[#1a1f5e] mb-1">Ticket Created!</h2>
        <p className="text-sm text-gray-400 mb-1">Raised on behalf of <span className="font-semibold text-[#1a1f5e]">{userName}</span></p>
        <p className="text-base font-bold mt-2 mb-6" style={{ color: ACCENT }}>{ticketId}</p>
        <div className="flex gap-3">
          <button onClick={onAnother} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">Raise Another</button>
          <button onClick={onView} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity" style={{ background: ACCENT }}>View Tickets</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RaiseTicketPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addTicket } = useTickets();
  const { categories, categoryDefaults, categoryTree } = useSLA();

  // Real user directory, loaded from Supabase
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingDirectory(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, employer_id, role")
        .order("name", { ascending: true });

      if (error) {
        console.error("Failed to load user directory:", error);
        setLoadingDirectory(false);
        return;
      }

      setDirectory(
        (data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name || p.email,
          email: p.email,
          employerId: p.employer_id || "—",
          role: p.role,
          avatar: initialsFor(p.name || p.email),
          color: colorFor(p.id),
        }))
      );
      setLoadingDirectory(false);
    })();
  }, []);

  // User search
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = () => setDropdownOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [dropdownOpen]);

  // Ticket fields
  const [category, setCategory] = useState<Category | "">("");
  const [subcategory, setSubcategory] = useState("");
  const [subSubcategory, setSubSubcategory] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState("");

  // Derived from category/subcategory state — must come AFTER useState declarations
  const selectedCategoryNode = categoryTree.find((c) => c.name === category);
  const availableSubcategories = selectedCategoryNode?.subcategories ?? [];
  const selectedSubcategoryNode = availableSubcategories.find((s) => s.name === subcategory);
  const availableItems = selectedSubcategoryNode?.items ?? [];

  const filtered = query.length > 0
    ? directory.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      )
    : directory;

  const selectUser = (u: DirectoryUser) => {
    setSelectedUser(u);
    setQuery(u.name);
    setDropdownOpen(false);
    setErrors(e => ({ ...e, user: "" }));
  };

  const clearUser = () => {
    setSelectedUser(null);
    setQuery("");
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedUser) e.user = "Please search and select a user account";
    if (!category) e.category = "Category is required";
    if (!subject.trim()) e.subject = "Subject is required";
    if (!details.trim()) e.details = "Details are required";
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    if (!selectedUser) return;
    const newTicket = await addTicket({
      subject,
      details,
      category: category as Category,
      subcategory: subcategory || undefined,
      subSubcategory: subSubcategory || undefined,
      priority,
      customer: selectedUser.name,
      email: selectedUser.email,
      attachments,
    });
    setTicketId(newTicket.id);
    setSubmitted(true);
  };

  const reset = () => {
    setSelectedUser(null); setQuery(""); setCategory(""); setSubcategory(""); setSubSubcategory(""); setPriority("Medium");
    setSubject(""); setDetails(""); setAttachments([]); setErrors({}); setSubmitted(false);
  };

  if (submitted && selectedUser) {
    return (
      <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>
        <Sidebar active="raise-ticket" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader />
          <SuccessScreen ticketId={ticketId} userName={selectedUser.name} onAnother={reset} onView={() => navigate("/tickets")} />
        </div>
      </div>
    );
  }

  function PageHeader() {
    return (
      <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/tickets")} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-bold text-[#1a1f5e]">Raise on Behalf</h1>
            <p className="text-xs text-gray-400">Create a ticket on behalf of a registered user</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <UserProfileChip />
        </div>
      </header>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>
      <Sidebar active="raise-ticket" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader />
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form onSubmit={submit}>
            <div className="grid grid-cols-3 gap-5 max-w-5xl mx-auto">

              {/* ── Left: 2 cols ── */}
              <div className="col-span-2 space-y-5">

                {/* User search card */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#eff6ff" }}>
                      <Search size={14} className="text-blue-500" />
                    </div>
                    <h2 className="text-sm font-bold text-[#1a1f5e]">Find User Account</h2>
                  </div>

                  {/* Search input */}
                  <FieldLabel label="Select user (or search by name/email)" required />
                  <div className="relative">
                    <div
                      onClick={(e) => { e.stopPropagation(); if (!selectedUser && !loadingDirectory) setDropdownOpen(o => !o); }}
                      className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 transition-all cursor-pointer ${errors.user ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"} ${selectedUser ? "bg-gray-50" : ""}`}>
                      <Search size={14} className="text-gray-400 flex-shrink-0" />
                      <input
                        value={query}
                        onChange={e => { setQuery(e.target.value); setDropdownOpen(true); if (selectedUser) setSelectedUser(null); }}
                        onFocus={() => setDropdownOpen(true)}
                        placeholder={loadingDirectory ? "Loading users..." : "Click to select, or type to search..."}
                        disabled={loadingDirectory}
                        className="flex-1 text-sm outline-none bg-transparent text-[#1a1f5e] placeholder-gray-400 cursor-pointer"
                        readOnly={!!selectedUser}
                      />
                      {loadingDirectory
                        ? <Loader2 size={14} className="animate-spin text-gray-300 flex-shrink-0" />
                        : selectedUser
                          ? <button type="button" onClick={(e) => { e.stopPropagation(); clearUser(); }} className="text-gray-400 hover:text-red-400 transition-colors"><X size={14} /></button>
                          : <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                      }
                    </div>

                    {/* Dropdown */}
                    {dropdownOpen && !selectedUser && !loadingDirectory && (
                      <div onClick={(e) => e.stopPropagation()} className="absolute z-20 left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden max-h-56 overflow-y-auto">
                        {filtered.length === 0
                          ? <p className="text-xs text-gray-400 text-center py-6">No users found for "{query}"</p>
                          : filtered.map(u => (
                            <button key={u.id} type="button" onClick={() => selectUser(u)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: u.color }}>{u.avatar}</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-semibold text-[#1a1f5e]">{u.name}</p>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0"
                                    style={{ background: "#f3f4f6", color: "#6b7280" }}>{u.role}</span>
                                </div>
                                <p className="text-[10px] text-gray-400 truncate">{u.email} · {u.employerId}</p>
                              </div>
                            </button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  {errors.user && <p className="text-[11px] text-red-500 mt-1.5">{errors.user}</p>}

                  {/* Selected user card */}
                  {selectedUser && (
                    <div className="mt-4 flex items-center gap-4 p-4 rounded-xl border-2" style={{ borderColor: ACCENT + "30", background: "#f5f3ff" }}>
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ background: selectedUser.color }}>{selectedUser.avatar}</div>
                      <div className="flex-1 grid grid-cols-4 gap-3">
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Full Name</p>
                          <p className="text-xs font-bold text-[#1a1f5e] mt-0.5">{selectedUser.name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Email</p>
                          <p className="text-xs font-medium text-[#1a1f5e] mt-0.5 truncate">{selectedUser.email}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Employer ID</p>
                          <p className="text-xs font-bold mt-0.5" style={{ color: ACCENT }}>{selectedUser.employerId}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-gray-400 uppercase tracking-wide font-semibold">Role</p>
                          <p className="text-xs font-bold mt-0.5 capitalize" style={{ color: ACCENT }}>{selectedUser.role}</p>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#ecfdf5" }}>
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Ticket fields card */}
                <div className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#f5f3ff" }}>
                      <Ticket size={14} style={{ color: ACCENT }} />
                    </div>
                    <h2 className="text-sm font-bold text-[#1a1f5e]">Ticket Details</h2>
                  </div>

                  <div className="space-y-4">
                    {/* Raised by — locked */}
                    <LockedInput label="Raised by (Agent)" value={user ? `${user.name}  ·  ${user.email}` : "—"} icon={UserCircle} />

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
                        <FieldLabel label="Subcategory" />
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
                        <FieldLabel label={subcategory || "Item"} />
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
                        rows={5} placeholder="Describe the issue in detail — steps to reproduce, what was expected, what actually happened..."
                        className={`w-full border rounded-xl px-4 py-2.5 text-sm outline-none bg-white text-[#1a1f5e] placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all resize-none ${errors.details ? "border-red-300" : "border-gray-200"}`} />
                      {errors.details && <p className="text-[11px] text-red-500 mt-1">{errors.details}</p>}
                    </div>

                    {/* Attachments */}
                    <div>
                      <FieldLabel label="Attachments" required={false} />
                      <AttachmentPicker attachments={attachments} onChange={setAttachments} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Right col: priority + submit ── */}
              <div className="space-y-5">
                {/* Priority */}
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

                {/* Submit */}
                <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
                  <button type="submit"
                    className="w-full py-3 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity"
                    style={{ background: selectedUser ? ACCENT : "#9ca3af" }}>
                    {selectedUser ? `Raise Ticket for ${selectedUser.name.split(" ")[0]}` : "Select a User First"}
                  </button>
                  <button type="button" onClick={() => navigate("/tickets")}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                    You are raising this ticket as an agent.<br />Your identity will be captured as "Raised by".
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}