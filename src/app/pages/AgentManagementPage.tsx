import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import { useTickets } from "../data/TicketsContext";
import { supabase } from "../lib/supabase";
import { Sidebar } from "../components/layout/Sidebar";
import { UserProfileChip } from "../components/layout/UserProfileChip";
import {
  ChevronDown, Users, Settings,
  Search, Plus, X, Mail, Phone, MapPin, Shield, ToggleLeft, ToggleRight,
  CheckCircle2, AlertTriangle, Clock, Layers, ChevronLeft,
  Activity, BarChart2, Inbox, UserX, UserCheck,
  Lock, Unlock, Send, Trash2, Loader2,
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
type AgentStatus = "Active" | "Inactive" | "Pending";
type AgentTier = "L1 Support" | "L2 Support" | "L3 Engineer" | "Team Lead" | "Admin";

type Permission = {
  raiseOnBehalf: boolean;
  closeTickets: boolean;
  viewAllQueues: boolean;
  viewAssignedOnly: boolean;
};

type Agent = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  color: string;
  role: AgentTier;
  status: AgentStatus;
  department: string;
  queue: string;
  category: string;
  dateAdded: string;
  lastActive: string;
  permissions: Permission;
  activity: { date: string; action: string }[];
};

// ─── Seed data ────────────────────────────────────────────────────────────────
const DEPARTMENTS = ["Technical", "Billing", "Customer Success", "Engineering", "Operations"];
const QUEUES = ["General Queue", "Priority Queue", "VIP Queue", "Escalation Queue"];
const CATEGORIES = ["Technical Support", "Billing", "General Inquiry", "Bug Report", "Feature Request"];
const TIERS: AgentTier[] = ["L1 Support", "L2 Support", "L3 Engineer", "Team Lead", "Admin"];


// ─── Status config ────────────────────────────────────────────────────────────
const statusCfg: Record<AgentStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  Active:   { color: "#10b981", bg: "#ecfdf5", icon: <CheckCircle2 size={11} /> },
  Inactive: { color: "#6b7280", bg: "#f3f4f6", icon: <UserX size={11} /> },
  Pending:  { color: "#f59e0b", bg: "#fffbeb", icon: <Clock size={11} /> },
};

const tierColors: Record<AgentTier, string> = {
  "L1 Support":   "#60a5fa",
  "L2 Support":   "#5f63f2",
  "L3 Engineer":  "#c084fc",
  "Team Lead":    "#f59e0b",
  "Admin":        "#ef4444",
};

// ─── Workload bar ─────────────────────────────────────────────────────────────
function WorkloadBar({ count }: { count: number }) {
  const max = 20;
  const pct = Math.min(count / max, 1);
  const color = pct < 0.4 ? "#10b981" : pct < 0.7 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold w-4 text-right" style={{ color }}>{count}</span>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-600">{label}</span>
      <button type="button" onClick={() => onChange(!value)} className="flex-shrink-0">
        {value
          ? <ToggleRight size={26} style={{ color: ACCENT }} />
          : <ToggleLeft size={26} className="text-gray-300" />}
      </button>
    </div>
  );
}

// ─── Invite modal ─────────────────────────────────────────────────────────────
function InviteModal({ onClose, onInvite }: { onClose: () => void; onInvite: (email: string, role: AgentTier) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AgentTier>("L1 Support");
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const send = () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setErr("Enter a valid email address"); return; }
    onInvite(email, role);
    setSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-[#1a1f5e]">Invite New Agent</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={15} /></button>
        </div>
        {sent ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#ecfdf5" }}>
              <Send size={22} className="text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-[#1a1f5e]">Invite sent!</p>
            <p className="text-xs text-gray-400 mt-1">{email} will receive an email to join as <strong>{role}</strong>.</p>
            <button onClick={onClose} className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: ACCENT }}>Done</button>
          </div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Email Address</label>
              <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 ${err ? "border-red-300 bg-red-50" : "border-gray-200"}`}>
                <Mail size={14} className="text-gray-400" />
                <input value={email} onChange={e => { setEmail(e.target.value); setErr(""); }}
                  placeholder="agent@company.com" className="flex-1 text-sm outline-none bg-transparent text-[#1a1f5e] placeholder-gray-400" />
              </div>
              {err && <p className="text-[11px] text-red-500 mt-1">{err}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1.5">Role / Tier</label>
              <div className="relative">
                <select value={role} onChange={e => setRole(e.target.value as AgentTier)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer focus:border-purple-400 pr-8">
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={send} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: ACCENT }}>Send Invite</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Side Panel ───────────────────────────────────────────────────────────────
// Seed contact details per agent (in real app these come from auth/profile DB)
const agentContacts: Record<string, { phone: string; address: string }> = {
  "AGT-001": { phone: "+1 (555) 101-2020", address: "14 Elm Street, Boston, MA 02101" },
  "AGT-002": { phone: "+1 (555) 202-3030", address: "99 Bay Rd, San Francisco, CA 94107" },
  "AGT-003": { phone: "+1 (555) 303-4040", address: "5 Park Ave, New York, NY 10010" },
  "AGT-004": { phone: "+1 (555) 404-5050", address: "200 Lake Shore Dr, Chicago, IL 60601" },
  "AGT-005": { phone: "+1 (555) 505-6060", address: "300 Main St, Dallas, TX 75201" },
  "AGT-006": { phone: "—", address: "—" },
  "AGT-007": { phone: "+1 (555) 707-8080", address: "1 Apex Tower, Gotham City, NJ 07030" },
};

function AgentPanel({ agent, stats, onClose, onUpdate, onDelete }: { agent: Agent; stats: { open: number; handled: number }; onClose: () => void; onUpdate: (a: Agent) => void; onDelete: (a: Agent) => Promise<void> }) {
  const sc = statusCfg[agent.status];
  const contact = agentContacts[agent.id] ?? { phone: "—", address: "—" };
  const [tab, setTab] = useState<"profile" | "tickets" | "settings">("profile");
  const [perms, setPerms] = useState<Permission>({ ...agent.permissions });
  const [dept, setDept] = useState(agent.department);
  const [queue, setQueue] = useState(agent.queue);
  const [categories, setCategories] = useState<Set<string>>(new Set(agent.category.split(",").map(s => s.trim()).filter(Boolean)));
  const [role, setRole] = useState<AgentTier>(agent.role);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = () => onUpdate({ ...agent, permissions: perms, department: dept, queue, category: Array.from(categories).join(", "), role });
  const toggleStatus = () => onUpdate({ ...agent, status: agent.status === "Active" ? "Inactive" : "Active" });
  const setPerm = (key: keyof Permission, val: boolean) => setPerms(p => ({ ...p, [key]: val }));

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100 overflow-hidden" style={{ width: 380 }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: agent.color }}>{agent.avatar}</div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                style={{ background: agent.status === "Active" ? "#10b981" : agent.status === "Pending" ? "#f59e0b" : "#d1d5db" }} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1a1f5e]">{agent.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: tierColors[agent.role] + "18", color: tierColors[agent.role] }}>{agent.role}</span>
                <span className="flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>
                  {sc.icon}{agent.status}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0"><X size={15} /></button>
        </div>
        {/* Compact contact row */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><Mail size={11} className="text-gray-400" />{agent.email}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><Phone size={11} className="text-gray-400" />{contact.phone}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500"><MapPin size={11} className="text-gray-400" />{contact.address}</div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 border-b border-gray-100 flex-shrink-0">
        {[
          { label: "Open", value: stats.open, color: stats.open > 10 ? "#ef4444" : "#10b981" },
          { label: "Handled", value: stats.handled, color: ACCENT },
          { label: "Dept", value: agent.department.slice(0, 4), color: "#6b7280" },
          { label: "Since", value: agent.dateAdded.split(",")[0], color: "#6b7280" },
        ].map(s => (
          <div key={s.label} className="py-3 text-center border-r border-gray-100 last:border-0">
            <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 flex-shrink-0">
        {(["profile", "tickets", "settings"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-semibold capitalize transition-colors"
            style={{ color: tab === t ? ACCENT : "#9ca3af", borderBottom: tab === t ? `2px solid ${ACCENT}` : "2px solid transparent" }}>
            {t === "profile" ? "Profile" : t === "tickets" ? "Tickets" : "Settings"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "profile" && (
          <div className="px-5 py-4 space-y-4">
            {/* Role & Queue summary */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Role & Assignment</p>
              <div className="bg-gray-50 rounded-xl px-4 py-1">
                {[
                  { label: "Role / Tier", value: agent.role },
                  { label: "Department", value: agent.department },
                  { label: "Assigned Queue", value: agent.queue },
                  { label: "Category", value: agent.category },
                  { label: "Last Active", value: agent.lastActive },
                  { label: "Date Added", value: agent.dateAdded },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-white last:border-0 text-xs">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-[#1a1f5e]">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions summary */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Permissions</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "raiseOnBehalf", label: "Raise on Behalf" },
                  { key: "closeTickets", label: "Close Tickets" },
                  { key: "viewAllQueues", label: "View All Queues" },
                  { key: "viewAssignedOnly", label: "Assigned Only" },
                ].map(({ key, label }) => {
                  const on = agent.permissions[key as keyof Permission];
                  return (
                    <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: on ? "#f0f9ff" : "#f9fafb" }}>
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: on ? "#3b82f6" : "#d1d5db" }} />
                      <span className="text-[10px] font-medium" style={{ color: on ? "#1d4ed8" : "#9ca3af" }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Recent Activity</p>
              {agent.activity.map((a, i) => (
                <div key={i} className="flex gap-3 py-2.5 border-b border-gray-50 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ACCENT }} />
                  <div>
                    <p className="text-xs text-[#1a1f5e]">{a.action}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{a.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "tickets" && (
          <div className="px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">Workload</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Open Tickets</p>
                <p className="text-2xl font-bold" style={{ color: stats.open > 10 ? "#ef4444" : "#10b981" }}>{stats.open}</p>
                <WorkloadBar count={stats.open} />
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Total Handled</p>
                <p className="text-2xl font-bold" style={{ color: ACCENT }}>{stats.handled}</p>
                <p className="text-[10px] text-gray-400 mt-1">All time</p>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Recent Tickets</p>
            {["#T-1041 — Login issue", "#T-1039 — API timeout", "#T-1037 — Billing dispute"].map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 text-xs">
                <span className="text-[#1a1f5e] font-medium">{t}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#3b82f6" }}>Open</span>
              </div>
            ))}
          </div>
        )}

        {tab === "settings" && (
          <div className="px-5 py-4 space-y-5">
            {/* Role */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Role / Tier</p>
              <div className="relative">
                <select value={role} onChange={e => setRole(e.target.value as AgentTier)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer pr-8">
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Assignments */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-2">Assignments</p>
              <div className="space-y-2">
                {[
                  { label: "Department", val: dept, setter: setDept, opts: DEPARTMENTS },
                  { label: "Queue", val: queue, setter: setQueue, opts: QUEUES },
                ].map(({ label, val, setter, opts }) => (
                  <div key={label}>
                    <p className="text-[10px] text-gray-400 mb-1">{label}</p>
                    <div className="relative">
                      <select value={val} onChange={e => setter(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none appearance-none bg-white text-[#1a1f5e] cursor-pointer pr-7">
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">Categories (auto-routing)</p>
                  <div className="space-y-1 bg-gray-50 rounded-xl px-3 py-2">
                    {CATEGORIES.map(c => (
                      <label key={c} className="flex items-center gap-2 text-xs text-gray-700 py-0.5 cursor-pointer">
                        <input type="checkbox" checked={categories.has(c)}
                          onChange={() => setCategories(prev => {
                            const next = new Set(prev);
                            next.has(c) ? next.delete(c) : next.add(c);
                            return next;
                          })} />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1">Permissions</p>
              <div className="bg-gray-50 rounded-xl px-4 py-1">
                <Toggle value={perms.raiseOnBehalf} onChange={v => setPerm("raiseOnBehalf", v)} label="Raise tickets on behalf" />
                <Toggle value={perms.closeTickets} onChange={v => setPerm("closeTickets", v)} label="Close tickets" />
                <Toggle value={perms.viewAllQueues} onChange={v => setPerm("viewAllQueues", v)} label="View all queues" />
                <Toggle value={perms.viewAssignedOnly} onChange={v => setPerm("viewAssignedOnly", v)} label="View assigned queues only" />
              </div>
            </div>

            {/* Save / deactivate */}
            <button onClick={save} className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity" style={{ background: ACCENT }}>
              Save Changes
            </button>
            <button onClick={toggleStatus}
              className="w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors"
              style={agent.status === "Active"
                ? { borderColor: "#fca5a5", color: "#ef4444", background: "#fef2f2" }
                : { borderColor: "#6ee7b7", color: "#10b981", background: "#ecfdf5" }}>
              {agent.status === "Active" ? "Deactivate Agent" : "Reactivate Agent"}
            </button>
            <p className="text-[10px] text-gray-400 text-center -mt-2">Deactivating preserves all history and tickets.</p>

            <div className="pt-3 border-t border-gray-100 space-y-2">
              {!confirmingDelete ? (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-1.5">
                  <Trash2 size={14} />Delete Agent Permanently
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 text-center font-medium">Permanently delete {agent.name}? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      className="flex-1 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                      Cancel
                    </button>
                    <button
                      onClick={async () => { setDeleting(true); await onDelete(agent); setDeleting(false); }}
                      disabled={deleting}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 flex items-center justify-center">
                      {deleting ? <Loader2 size={14} className="animate-spin" /> : "Confirm Delete"}
                    </button>
                  </div>
                </div>
              )}
              <p className="text-[10px] text-gray-400 text-center">Removes their account and login entirely. Their past tickets remain, but will no longer be linked to an active agent.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function AgentManagementPage() {
  const { updateUserRole } = useAuth();
  const { tickets } = useTickets();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from("agents").select("*").order("date_added", { ascending: false });
      if (error) throw error;
      setAgents((data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        avatar: row.avatar ?? "AG",
        color: row.color ?? "#5f63f2",
        role: row.role,
        status: row.status,
        department: row.department ?? "Operations",
        queue: row.queue ?? "General Queue",
        category: row.category ?? "General Inquiry",
        dateAdded: row.date_added ?? "",
        lastActive: row.last_active ?? "Never",
        permissions: row.permissions ?? { raiseOnBehalf: false, closeTickets: false, viewAllQueues: false, viewAssignedOnly: true },
        activity: [],
      })));
    } catch (err) {
      console.error("Failed to load agents:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  // Derived live from real tickets, matched by agent name — replaces the
  // old hardcoded openTickets/totalHandled fields, which drifted out of
  // sync with reality the moment tickets became real data.
  const agentStats = useMemo(() => {
    const map = new Map<string, { open: number; handled: number }>();
    tickets.forEach((t) => {
      const entry = map.get(t.agent) ?? { open: 0, handled: 0 };
      entry.handled += 1;
      if (t.status !== "Closed" && t.status !== "Resolved") entry.open += 1;
      map.set(t.agent, entry);
    });
    return map;
  }, [tickets]);

  const getAgentStats = (name: string) => agentStats.get(name) ?? { open: 0, handled: 0 };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "All">("All");
  const [tierFilter, setTierFilter] = useState<AgentTier | "All">("All");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const updateAgent = async (updated: Agent) => {
    const previous = agents.find(a => a.id === updated.id);
    const { error } = await supabase.from("agents").update({
      name: updated.name, role: updated.role, status: updated.status,
      department: updated.department, queue: updated.queue, category: updated.category,
      last_active: updated.lastActive, permissions: updated.permissions,
    }).eq("id", updated.id);
    if (error) { console.error("Failed to update agent:", error); return; }
    setAgents(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSelectedAgent(updated);
    if (previous && previous.role !== updated.role) {
      updateUserRole(updated.email, updated.role === "Admin" ? "admin" : "agent");
    }
  };

  // Permanent delete: calls the Supabase Edge Function, which deletes the
  // "agents" row, the "profiles" row, AND the underlying Supabase Auth
  // account using the service role key (something the browser can never
  // safely do on its own). This is irreversible — the account and login
  // are both gone. Past tickets referencing this agent by name/email are
  // left as-is.
  const deleteAgent = async (agentToDelete: Agent) => {
    try {
      await callEdgeFunction("delete-agent", { id: agentToDelete.id });
      setSelectedAgent(null);
      await fetchAgents();
    } catch (err) {
      console.error("Failed to delete agent:", err);
    }
  };

  // Invite: calls the Supabase Edge Function, which sends the actual auth
  // invite email AND inserts the "agents" row using the service role key.
  const handleInvite = async (email: string, role: AgentTier) => {
    try {
      await callEdgeFunction("invite-agent", {
        email,
        name: email.split("@")[0],
        role: role === "Admin" ? "admin" : "agent",
      });
      await fetchAgents(); // pulls the real row the function just inserted
    } catch (err) {
      console.error("Failed to invite agent:", err);
    }
  };

  const filtered = agents.filter(a => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || a.status === statusFilter;
    const matchTier = tierFilter === "All" || a.role === tierFilter;
    return matchSearch && matchStatus && matchTier;
  });

  const counts = {
    total: agents.length,
    active: agents.filter(a => a.status === "Active").length,
    inactive: agents.filter(a => a.status === "Inactive").length,
    pending: agents.filter(a => a.status === "Pending").length,
    openTickets: agents.reduce((s, a) => s + getAgentStats(a.name).open, 0),
  };

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>
      <Sidebar active="agents" />

      <div className="flex-1 flex overflow-hidden">
        {/* ── Main column ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm flex-shrink-0">
            <div>
              <h1 className="text-base font-bold text-[#1a1f5e]">Agent Management</h1>
              <p className="text-xs text-gray-400">Manage agents, permissions, queues, and workloads</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowInvite(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: ACCENT }}>
                <Plus size={14} />Add Agent
              </button>
              <UserProfileChip />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Total Agents", value: counts.total, color: ACCENT, bg: "#f5f3ff", icon: <Users size={15} /> },
                { label: "Active", value: counts.active, color: "#10b981", bg: "#ecfdf5", icon: <UserCheck size={15} /> },
                { label: "Inactive", value: counts.inactive, color: "#6b7280", bg: "#f3f4f6", icon: <UserX size={15} /> },
                { label: "Pending Invite", value: counts.pending, color: "#f59e0b", bg: "#fffbeb", icon: <Clock size={15} /> },
                { label: "Open Tickets", value: counts.openTickets, color: "#ef4444", bg: "#fef2f2", icon: <Inbox size={15} /> },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Table card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Filters */}
              <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 flex-1 min-w-48">
                  <Search size={13} className="text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, email, or role..."
                    className="bg-transparent text-xs outline-none w-full text-gray-600 placeholder-gray-400" />
                  {search && <button onClick={() => setSearch("")} className="text-gray-300 hover:text-gray-500"><X size={12} /></button>}
                </div>
                <div className="relative">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as AgentStatus | "All")}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none appearance-none bg-white text-gray-600 cursor-pointer pr-7">
                    <option value="All">All Status</option>
                    {(["Active", "Inactive", "Pending"] as AgentStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={tierFilter} onChange={e => setTierFilter(e.target.value as AgentTier | "All")}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none appearance-none bg-white text-gray-600 cursor-pointer pr-7">
                    <option value="All">All Tiers</option>
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                <p className="text-xs text-gray-400 ml-auto">{filtered.length} agent{filtered.length !== 1 ? "s" : ""}</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Agent", "Role / Tier", "Department", "Queue", "Status", "Workload", "Permissions", "Date Added", ""].map((h, i) => (
                        <th key={i} className="text-left px-4 py-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={9} className="text-center py-12 text-gray-400 text-sm">No agents found</td></tr>
                    )}
                    {filtered.map(agent => {
                      const sc = statusCfg[agent.status];
                      return (
                        <tr key={agent.id}
                          onClick={() => setSelectedAgent(agent)}
                          className={`border-b border-gray-50 cursor-pointer transition-colors group ${selectedAgent?.id === agent.id ? "bg-purple-50" : "hover:bg-gray-50"}`}>
                          {/* Agent */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="relative">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: agent.color }}>{agent.avatar}</div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                                  style={{ background: agent.status === "Active" ? "#10b981" : agent.status === "Pending" ? "#f59e0b" : "#d1d5db" }} />
                              </div>
                              <div>
                                <p className="font-semibold text-[#1a1f5e]">{agent.name}</p>
                                <p className="text-gray-400 text-[10px]">{agent.email}</p>
                              </div>
                            </div>
                          </td>
                          {/* Tier */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: tierColors[agent.role] + "18", color: tierColors[agent.role] }}>{agent.role}</span>
                          </td>
                          {/* Dept */}
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">{agent.department}</td>
                          {/* Queue */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="flex items-center gap-1 text-gray-500"><Layers size={11} />{agent.queue}</span>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold w-fit" style={{ background: sc.bg, color: sc.color }}>
                              {sc.icon}{agent.status}
                            </span>
                          </td>
                          {/* Workload */}
                          <td className="px-4 py-3" style={{ minWidth: 100 }}>
                            <WorkloadBar count={getAgentStats(agent.name).open} />
                          </td>
                          {/* Permissions */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-1">
                              {[
                                { key: "raiseOnBehalf", label: "RoB" },
                                { key: "closeTickets", label: "CT" },
                                { key: "viewAllQueues", label: "AQ" },
                              ].map(({ key, label }) => (
                                <span key={key} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                  style={agent.permissions[key as keyof Permission]
                                    ? { background: "#eff6ff", color: "#3b82f6" }
                                    : { background: "#f3f4f6", color: "#d1d5db" }}>
                                  {label}
                                </span>
                              ))}
                            </div>
                          </td>
                          {/* Date */}
                          <td className="px-4 py-3 whitespace-nowrap text-gray-400">{agent.dateAdded}</td>
                          {/* Action */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button onClick={e => { e.stopPropagation(); setSelectedAgent(agent); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity px-2.5 py-1 rounded-lg text-[10px] font-semibold text-white"
                              style={{ background: ACCENT }}>
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
        {selectedAgent && (
          <AgentPanel
            agent={selectedAgent}
            stats={getAgentStats(selectedAgent.name)}
            onClose={() => setSelectedAgent(null)}
            onUpdate={updateAgent}
            onDelete={deleteAgent}
          />
        )}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={(email, role) => { handleInvite(email, role); }}
        />
      )}
    </div>
  );
}