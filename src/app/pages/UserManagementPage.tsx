import { useState, useMemo, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { useTickets } from "../data/TicketsContext";
import { Sidebar } from "../components/layout/Sidebar";
import { UserProfileChip } from "../components/layout/UserProfileChip";
import { supabase } from "../lib/supabase";
import {
  Users, Settings, Search, Plus, X, Mail, Phone, MapPin, Building2,
  CheckCircle2, XCircle, Clock, ToggleLeft, ToggleRight, Download, Layers, 
  ChevronLeft, ChevronRight as ChevronRightIcon, ChevronDown,
  Trash2, UserX, Link2, Copy, Check, AlertCircle, Loader2
} from "lucide-react";

const FUNCTIONS_URL = "https://svdroiatjxbkjpzracia.functions.supabase.co";

async function callEdgeFunction(name: string, body: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error ?? res.statusText);
  }
  return res.json();
}

const ACCENT = "#5f63f2";

// ─── Types ────────────────────────────────────────────────────────────────────
type UserStatus = "Active" | "Suspended" | "Pending";

export type AppUser = {
  id: string; // Database UUID
  name: string;
  email: string;
  phone: string;
  address: string;
  employerId: string;
  department: string;
  status: UserStatus;
  dateRegistered: string;
  assignedAgent: string;
  assignedAgentColor: string;
  assignedAgentInitials: string;
  avatar: string;
  color: string;
};

const DEPARTMENTS = ["Engineering", "Marketing", "Finance", "HR", "Operations", "Sales", "Legal", "Design"];
const AGENTS = [
  { name: "Emma Johnson", color: "#f87171", initials: "EJ" },
  { name: "Liam Williams", color: "#fbbf24", initials: "LW" },
  { name: "Support Bot", color: ACCENT, initials: "SB" },
  { name: "Olivia Brown", color: "#c084fc", initials: "OB" },
];

// ─── Configuration Helpers ───────────────────────────────────────────────────
const statusCfg: Record<UserStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  Active:    { color: "#10b981", bg: "#ecfdf5", icon: <CheckCircle2 size={11} />, label: "Active" },
  Suspended: { color: "#ef4444", bg: "#fef2f2", icon: <XCircle size={11} />, label: "Suspended" },
  Pending:   { color: "#f59e0b", bg: "#fffbeb", icon: <Clock size={11} />, label: "Pending" },
};

const ticketStatusColor: Record<string, string> = {
  Open: "#3b82f6", Pending: "#f59e0b", Resolved: "#10b981", Closed: "#6b7280", Escalated: "#ef4444",
};

const PAGE_SIZE = 8;

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-600">{label}</span>
      <button type="button" onClick={() => onChange(!value)}>
        {value ? <ToggleRight size={26} style={{ color: ACCENT }} /> : <ToggleLeft size={26} className="text-gray-300" />}
      </button>
    </div>
  );
}

// ─── Add User Modal ───────────────────────────────────────────────────────────
function AddUserModal({ onClose, onAdd }: { onClose: () => void; onAdd: (u: Partial<AppUser>) => Promise<void> }) {
  const [tab, setTab] = useState<"manual" | "invite">("manual");
  const [name, setName] = useState(""); const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); const [dept, setDept] = useState(DEPARTMENTS[0]);
  const [employerId, setEmployerId] = useState(""); const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inviteLink = "https://kabstech.app/invite/join?token=abc123xyz";

  const copyLink = () => { navigator.clipboard?.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Required";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = "Valid email required";
    if (Object.keys(e).length) { setErrors(e); return; }
    
    setSubmitting(true);
    await onAdd({ 
      name, 
      email, 
      phone, 
      department: dept, 
      employerId: employerId || `EMP-${Date.now().toString().slice(-4)}`
    });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-[#1a1f5e]">Add New User</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={15} /></button>
        </div>

        <div className="flex border-b border-gray-100">
          {(["manual", "invite"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold capitalize transition-colors"
              style={{ color: tab === t ? ACCENT : "#9ca3af", borderBottom: tab === t ? `2px solid ${ACCENT}` : "2px solid transparent" }}>
              {t === "manual" ? "Manual Entry" : "Invite Link"}
            </button>
          ))}
        </div>

        {tab === "manual" ? (
          <div className="px-6 py-5 space-y-3">
            {[
              { label: "Full Name", key: "name", val: name, setter: setName, placeholder: "e.g. John Smith", type: "text" },
              { label: "Email Address", key: "email", val: email, setter: setEmail, placeholder: "user@company.com", type: "email" },
              { label: "Phone Number", key: "phone", val: phone, setter: setPhone, placeholder: "+1 (555) 000-0000", type: "tel" },
            ].map(({ label, key, val, setter, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-600 block mb-1">{label}{key !== "phone" && <span className="text-red-500 ml-0.5">*</span>}</label>
                <input type={type} value={val} onChange={e => { setter(e.target.value); setErrors(er => ({ ...er, [key]: "" })); }}
                  placeholder={placeholder}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none bg-white text-[#1a1f5e] placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all ${errors[key] ? "border-red-300" : "border-gray-200"}`} />
                {errors[key] && <p className="text-[11px] text-red-500 mt-1">{errors[key]}</p>}
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Employer ID <span className="text-[10px] text-gray-400 font-normal">(optional)</span></label>
              <input value={employerId} onChange={e => setEmployerId(e.target.value)} placeholder="Auto-generated if blank"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white text-[#1a1f5e] placeholder-gray-400 focus:border-purple-400 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Department</label>
              <div className="relative">
                <select value={dept} onChange={e => setDept(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer pr-8">
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button onClick={submit} disabled={submitting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center" style={{ background: ACCENT }}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : "Add User"}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "#f5f3ff" }}>
              <Link2 size={22} style={{ color: ACCENT }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1a1f5e]">Share Invite Link</p>
              <p className="text-xs text-gray-400 mt-1">Anyone with this link can register as a user in your workspace.</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200 text-left">
              <p className="flex-1 text-xs text-gray-500 truncate">{inviteLink}</p>
              <button onClick={copyLink} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                style={{ background: copied ? "#ecfdf5" : "#f5f3ff", color: copied ? "#10b981" : ACCENT }}>
                {copied ? <><Check size={12} />Copied</> : <><Copy size={12} />Copy</>}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2.5">
              <AlertCircle size={13} />
              <span>Link expires in 7 days. Regenerate anytime in Settings.</span>
            </div>
            <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSave }: { user: AppUser; onClose: () => void; onSave: (u: AppUser) => Promise<void> }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);
  const [dept, setDept] = useState(user.department);
  const [employerId, setEmployerId] = useState(user.employerId);
  const [agent, setAgent] = useState(user.assignedAgent);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const chosen = AGENTS.find(a => a.name === agent) ?? AGENTS[0];
    await onSave({ 
      ...user, name, email, phone, address, department: dept, employerId, 
      assignedAgent: agent, assignedAgentColor: chosen.color, assignedAgentInitials: chosen.initials 
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold text-[#1a1f5e]">Edit User — {user.name}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={15} /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {[
            { label: "Full Name", val: name, setter: setName },
            { label: "Email", val: email, setter: setEmail },
            { label: "Phone", val: phone, setter: setPhone },
            { label: "Address", val: address, setter: setAddress },
            { label: "Employer ID", val: employerId, setter: setEmployerId },
          ].map(({ label, val, setter }) => (
            <div key={label}>
              <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
              <input value={val} onChange={e => setter(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white text-[#1a1f5e] focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Department</label>
            <div className="relative">
              <select value={dept} onChange={e => setDept(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer pr-8">
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Assigned Agent</label>
            <div className="relative">
              <select value={agent} onChange={e => setAgent(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer pr-8">
                {AGENTS.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 flex items-center justify-center" style={{ background: ACCENT }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Side Panel ──────────────────────────────────────────────────────────
function UserPanel({ user, ticketCount, ticketHistory, onClose, onUpdate, onDelete }: { user: AppUser; ticketCount: number; ticketHistory: any[]; onClose: () => void; onUpdate: (u: AppUser) => Promise<void>; onDelete: (u: AppUser) => Promise<void> }) {
  const sc = statusCfg[user.status];
  const [tab, setTab] = useState<"details" | "tickets" | "settings">("details");
  const [notifications, setNotifications] = useState(true);
  const [twoFA, setTwoFA] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleStatus = async () => {
    const nextStatus = user.status === "Active" ? "Suspended" : "Active";
    await onUpdate({ ...user, status: nextStatus });
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white border-l border-gray-100 overflow-hidden flex-shrink-0" style={{ width: 360 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: user.color }}>{user.avatar}</div>
            <div>
              <p className="text-sm font-bold text-[#1a1f5e]">{user.name}</p>
              <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>
                {sc.icon}{sc.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowEdit(true)} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400" title="Edit">
              <Settings size={14} />
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={15} /></button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 border-b border-gray-100 flex-shrink-0">
          {[
            { label: "Tickets", value: ticketCount, color: ACCENT },
            { label: "Dept", value: user.department ? user.department.slice(0, 4) : "—", color: "#6b7280" },
            { label: "Since", value: user.dateRegistered.split(",")[0], color: "#6b7280" },
          ].map(s => (
            <div key={s.label} className="py-3 text-center border-r border-gray-100 last:border-0">
              <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(["details", "tickets", "settings"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-xs font-semibold capitalize transition-colors"
              style={{ color: tab === t ? ACCENT : "#9ca3af", borderBottom: tab === t ? `2px solid ${ACCENT}` : "2px solid transparent" }}>
              {t === "details" ? "Contact" : t === "tickets" ? "Tickets" : "Settings"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "details" && (
            <div className="px-5 py-4 space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Contact Details</p>
              {[
                { icon: Mail, label: "Email", value: user.email },
                { icon: Phone, label: "Phone", value: user.phone || "—" },
                { icon: MapPin, label: "Address", value: user.address || "—" },
                { icon: Building2, label: "Department", value: user.department || "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f5f3ff" }}>
                    <Icon size={13} style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">{label}</p>
                    <p className="text-xs font-medium text-[#1a1f5e] mt-0.5">{value}</p>
                  </div>
                </div>
              ))}

              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold pt-2">Account Info</p>
              {[
                { label: "Employer ID", value: user.employerId || "—" },
                { label: "Date Registered", value: user.dateRegistered },
                { label: "Assigned Agent", value: user.assignedAgent },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 text-xs">
                  <span className="text-gray-400">{label}</span>
                  {label === "Assigned Agent" ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: user.assignedAgentColor }}>{user.assignedAgentInitials}</div>
                      <span className="font-semibold text-[#1a1f5e]">{value}</span>
                    </div>
                  ) : (
                    <span className="font-semibold text-[#1a1f5e]">{value}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "tickets" && (
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Ticket History</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#f5f3ff", color: ACCENT }}>{ticketCount} total</span>
              </div>
              {ticketHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">No tickets yet</div>
              ) : (
                <div className="space-y-2">
                  {ticketHistory.map((t: any) => (
                    <div key={t.id} className="bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold" style={{ color: ACCENT }}>#{t.id.slice(0, 8)}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: (ticketStatusColor[t.status] ?? "#6b7280") + "18", color: ticketStatusColor[t.status] ?? "#6b7280" }}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#1a1f5e]">{t.subject}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(t.created_at || t.date).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "settings" && (
            <div className="px-5 py-4 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Reassign Department</p>
                <div className="relative">
                  <select value={user.department || ""} onChange={e => onUpdate({ ...user, department: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer pr-8">
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Preferences</p>
                <div className="bg-gray-50 rounded-xl px-4 py-1">
                  <Toggle value={notifications} onChange={setNotifications} label="Email notifications" />
                  <Toggle value={twoFA} onChange={setTwoFA} label="Two-factor authentication" />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button onClick={toggleStatus}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                  style={user.status === "Active"
                    ? { borderColor: "#fca5a5", color: "#ef4444", background: "#fef2f2" }
                    : { borderColor: "#6ee7b7", color: "#10b981", background: "#ecfdf5" }}>
                  {user.status === "Active" ? "Suspend Account" : "Reactivate Account"}
                </button>
                <p className="text-[10px] text-gray-400 text-center">Suspending preserves all data and ticket history.</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-gray-100">
                {!confirmingDelete ? (
                  <button
                    onClick={() => setConfirmingDelete(true)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5">
                    <Trash2 size={14} />Delete User Permanently
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-red-600 text-center font-medium">Permanently delete {user.name}? This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmingDelete(false)}
                        disabled={deleting}
                        className="flex-1 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                        Cancel
                      </button>
                      <button
                        onClick={async () => { setDeleting(true); await onDelete(user); setDeleting(false); }}
                        disabled={deleting}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 flex items-center justify-center">
                        {deleting ? <Loader2 size={14} className="animate-spin" /> : "Confirm Delete"}
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-gray-400 text-center">Removes their account and login entirely. Their past tickets remain, but will no longer be linked to an active user.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showEdit && (
        <EditUserModal
          user={user}
          onClose={() => setShowEdit(false)}
          onSave={async (u) => { await onUpdate(u); setShowEdit(false); }}
        />
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserManagementPage() {
  const { setAccountDisabled } = useAuth();
  const { tickets } = useTickets();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "All">("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [page, setPage] = useState(1);
  const [bulkDept, setBulkDept] = useState(DEPARTMENTS[0]);
  const [showBulkDept, setShowBulkDept] = useState(false);

  // Sync state with Supabase backend profiles matching role = 'customer'.
  const fetchUsersFromDB = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "customer")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedUsers: AppUser[] = (data || []).map((p: any, index: number) => {
        const initials = p.name ? p.name.slice(0, 2).toUpperCase() : "US";
        const colors = ["#f87171", "#fbbf24", "#c084fc", "#fb923c", "#34d399", "#60a5fa", "#a78bfa", "#f472b6", "#2dd4bf", "#facc15"];
        const color = colors[index % colors.length];
        
        // Match with mock assigned agents for panel context
        const assignedAgent = AGENTS[index % AGENTS.length];

        return {
          id: p.id,
          name: p.name || "Unnamed User",
          email: p.email,
          phone: p.phone || "",
          address: p.address || "",
          employerId: p.employer_id || `EMP-${p.id.slice(0, 4).toUpperCase()}`,
          department: p.department || "",
          status: p.is_active ? "Active" : "Suspended",
          dateRegistered: new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          assignedAgent: assignedAgent.name,
          assignedAgentColor: assignedAgent.color,
          assignedAgentInitials: assignedAgent.initials,
          avatar: initials,
          color: color
        };
      });

      setUsers(formattedUsers);
      
      // Update selected profile focus reference if open
      if (selectedUser) {
        const current = formattedUsers.find(x => x.id === selectedUser.id);
        if (current) setSelectedUser(current);
      }
    } catch (err) {
      console.error("Error reading users database directory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersFromDB();
  }, []);

  // Live ticket counts map compiled via global contextual states
  const ticketCounts = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => {
      const key = t.email.toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [tickets]);

  const getTicketCount = (email: string) => ticketCounts.get(email.toLowerCase()) ?? 0;

  const getTicketHistory = (email: string) => {
    return tickets.filter(t => t.email.toLowerCase() === email.toLowerCase());
  };

  // Perform multi-row bulk updates directly down inside database contexts
  const handleBulkDepartmentChange = async () => {
    if (selected.size === 0) return;
    try {
      const idsToUpdate = Array.from(selected);
      const { error } = await supabase
        .from("profiles")
        .update({ department: bulkDept })
        .in("id", idsToUpdate);

      if (error) throw error;
      
      await fetchUsersFromDB();
      setSelected(new Set());
      setShowBulkDept(false);
    } catch (err) {
      console.error("Bulk update failed:", err);
    }
  };

  const updateUser = async (u: AppUser) => {
    try {
      const previous = users.find(x => x.id === u.id);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          name: u.name,
          phone: u.phone,
          department: u.department,
          address: u.address,
          employer_id: u.employerId,
          is_active: u.status === "Active"
        })
        .eq("id", u.id);

      if (error) throw error;

      // Direct Auth layer action handling to sync active login permissions
      if (previous && previous.status !== u.status) {
        await setAccountDisabled(u.email, u.status === "Suspended");
      }

      await fetchUsersFromDB();
    } catch (err) {
      console.error("Failed executing profile change transaction:", err);
    }
  };

  // Permanent delete: calls the Supabase Edge Function, which deletes the
  // "profiles" row AND the underlying Supabase Auth account using the
  // service role key (something the browser can never safely do on its
  // own). This is irreversible — the account and login are both gone.
  // Past tickets referencing this person by name/email are left as-is.
  const deleteUser = async (u: AppUser) => {
    try {
      await callEdgeFunction("delete-user", { id: u.id });
      setSelectedUser(null);
      await fetchUsersFromDB();
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  // Invite: calls the Supabase Edge Function, which creates the auth user
  // and sends a proper invite email (the user sets their own password via
  // emailed link) using the service role key. We never set or store a
  // shared/default password client-side.
  const addUser = async (data: Partial<AppUser>) => {
    try {
      await callEdgeFunction("invite-user", {
        email: data.email,
        name: data.name,
        phone: data.phone,
        department: data.department,
        employerId: data.employerId,
      });
      await fetchUsersFromDB();
    } catch (err) {
      console.error("Failed to invite user:", err);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.employerId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || u.status === statusFilter;
    const matchDept = deptFilter === "All" || u.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const toggleSelectAll = () => {
    if (selected.size === paginatedUsers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedUsers.map(u => u.id)));
    }
  };

  const toggleSelectUser = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f2f8]" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar active="users" />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 bg-white shadow-sm flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
              <Users size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-[#1a1f5e]">User Management</h1>
              <p className="text-xs text-gray-400">Manage clients, configure assignments, and view ticket trends</p>
            </div>
          </div>
          <UserProfileChip />
        </header>

        {/* Toolbar */}
        <div className="p-6 pb-2 flex flex-col gap-3 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-1 items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm max-w-md">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, email, or employer ID..."
                className="bg-transparent text-sm outline-none w-full text-gray-600 placeholder-gray-400" />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
                className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-600 outline-none shadow-sm cursor-pointer">
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Pending">Pending</option>
              </select>

              <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs text-gray-600 outline-none shadow-sm cursor-pointer">
                <option value="All">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity" style={{ background: ACCENT }}>
                <Plus size={14} /> Add User
              </button>
            </div>
          </div>

          {/* Bulk Action Panels */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 animate-fadeIn">
              <span className="text-xs font-semibold text-purple-700">{selected.size} users selected for processing</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setShowBulkDept(!showBulkDept)} className="flex items-center gap-1 bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs text-purple-700 font-medium hover:bg-gray-50 shadow-sm">
                    <Layers size={12} /> Assign Department <ChevronDown size={11} />
                  </button>
                  {showBulkDept && (
                    <div className="absolute right-0 bottom-full mb-1 z-20 bg-white border border-gray-100 rounded-xl p-2 shadow-xl flex gap-1.5 whitespace-nowrap">
                      <select value={bulkDept} onChange={e => setBulkDept(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 outline-none">
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <button onClick={handleBulkDepartmentChange} className="bg-purple-600 text-white rounded-lg px-2.5 py-1 text-xs font-bold hover:bg-purple-700">Apply</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Workspace Tables Grid */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
            <div className="bg-white flex-1 rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={24} className="animate-spin text-purple-500" />
                  <p className="text-xs text-gray-400">Loading directory from production database...</p>
                </div>
              ) : paginatedUsers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <Users size={32} className="text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No client profiles found matching conditions.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left border-collapse min-w-[850px]">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                        <th className="px-4 py-3.5 w-10 text-center">
                          <input type="checkbox" checked={selected.size === paginatedUsers.length && paginatedUsers.length > 0} onChange={toggleSelectAll} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer" />
                        </th>
                        <th className="text-xs font-bold text-[#1a1f5e] px-4 py-3.5">User Details</th>
                        <th className="text-xs font-bold text-[#1a1f5e] px-4 py-3.5">Employer & Dept</th>
                        <th className="text-xs font-bold text-[#1a1f5e] px-4 py-3.5 text-center">Tickets</th>
                        <th className="text-xs font-bold text-[#1a1f5e] px-4 py-3.5">Assigned Routing</th>
                        <th className="text-xs font-bold text-[#1a1f5e] px-4 py-3.5">Status</th>
                        <th className="text-xs font-bold text-[#1a1f5e] px-4 py-3.5 text-right pr-6">Management</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {paginatedUsers.map(u => {
                        const sc = statusCfg[u.status];
                        const count = getTicketCount(u.email);
                        const isSelected = selectedUser?.id === u.id;
                        return (
                          <tr key={u.id} onClick={() => setSelectedUser(u)} className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${isSelected ? "bg-purple-50/40 hover:bg-purple-50/60" : ""}`}>
                            <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                              <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSelectUser(u.id)} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer" />
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: u.color }}>{u.avatar}</div>
                                <div>
                                  <p className="font-semibold text-[#1a1f5e] hover:underline">{u.name}</p>
                                  <p className="text-gray-400 text-[11px] mt-0.5">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-gray-600">
                              <p className="font-medium text-gray-700">{u.department || "Unassigned"}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">{u.employerId}</p>
                            </td>
                            <td className="px-4 py-3.5 text-center font-bold text-gray-700">
                              <span className={`inline-block px-2 py-0.5 rounded-md ${count > 0 ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-400"}`}>{count}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: u.assignedAgentColor }}>{u.assignedAgentInitials}</div>
                                <span className="text-gray-600 font-medium">{u.assignedAgent}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px]" style={{ background: sc.bg, color: sc.color }}>
                                {sc.icon} {sc.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right pr-6" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setSelectedUser(u)} className="text-purple-600 font-semibold hover:text-purple-700 hover:underline text-[11px]">View Panel</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-white">
                <span className="text-xs text-gray-400">Showing <b>{Math.min(filtered.length, (page - 1) * PAGE_SIZE + 1)}-{Math.min(filtered.length, page * PAGE_SIZE)}</b> of <b>{filtered.length}</b> rows</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-40"><ChevronLeft size={14} /></button>
                  <span className="text-xs font-bold px-3 text-[#1a1f5e]">Page {page} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-40"><ChevronRightIcon size={14} /></button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sliding Detail Panel */}
          {selectedUser && (
            <UserPanel
              user={selectedUser}
              ticketCount={getTicketCount(selectedUser.email)}
              ticketHistory={getTicketHistory(selectedUser.email)}
              onClose={() => setSelectedUser(null)}
              onUpdate={updateUser}
              onDelete={deleteUser}
            />
          )}
        </div>
      </div>

      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} onAdd={addUser} />}
    </div>
  );
}