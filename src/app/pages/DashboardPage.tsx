import { useMemo } from "react";
import { useAuth } from "../auth/AuthContext";
import { useTickets } from "../data/TicketsContext";
import { useSLA, getSLAStatus } from "../data/SLAContext";
import { Sidebar } from "../components/layout/Sidebar";
import { UserProfileChip, firstName, getGreeting } from "../components/layout/UserProfileChip";
import {
  SlidersHorizontal, TrendingUp, Clock,
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const ACCENT = "#5f63f2";
const ACCENT2 = "#f87171";
const ACCENT3 = "#34d399";
const ACCENT4 = "#fbbf24";
const ACCENT5 = "#60a5fa";
const ACCENT6 = "#c084fc";

const AGENT_PALETTE = [ACCENT, ACCENT5, ACCENT4, ACCENT3, ACCENT2, ACCENT6];
const CATEGORY_PALETTE = [ACCENT, ACCENT5, ACCENT4, ACCENT3, ACCENT2];

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return percent > 0.08 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  ) : null;
};

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 flex flex-col gap-1 shadow-sm">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || ACCENT }}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value, sub, up }: { label: string; value: string; sub?: string; up?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-bold text-[#1a1f5e]">{value}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${up ? "bg-green-100" : "bg-red-100"}`}>
        <TrendingUp size={14} className={up ? "text-green-500" : "text-red-400"} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { tickets: allTickets, isLoading } = useTickets();
  const { getResolutionHours } = useSLA();

  // Customers only ever see their own tickets on the dashboard — agents
  // and admins see the full system view.
  const tickets = user?.role === "customer"
    ? allTickets.filter((t) => t.email.toLowerCase() === user.email.toLowerCase())
    : allTickets;

  const stats = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === "Open").length;
    const pending = tickets.filter((t) => t.status === "Pending").length;
    const closed = tickets.filter((t) => t.status === "Closed").length;
    const resolved = tickets.filter((t) => t.status === "Resolved").length;
    const escalated = tickets.filter((t) => t.status === "Escalated").length;
    const breached = tickets.filter((t) => {
      const isClosed = t.status === "Closed" || t.status === "Resolved";
      return getSLAStatus(t.created, t.priority, isClosed, getResolutionHours(t.priority)).breached;
    }).length;
    return { total, open, pending, closed, resolved, escalated, closedOrResolved: closed + resolved, breached };
  }, [tickets, getResolutionHours]);

  const byAgent = useMemo(() => {
    const counts = new Map<string, number>();
    tickets.forEach((t) => counts.set(t.agent, (counts.get(t.agent) ?? 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: AGENT_PALETTE[i % AGENT_PALETTE.length] }));
  }, [tickets]);

  const byCategory = useMemo(() => {
    const counts = new Map<string, number>();
    tickets.forEach((t) => counts.set(t.category, (counts.get(t.category) ?? 0) + 1));
    const total = tickets.length || 1;
    return Array.from(counts.entries()).map(([name, count], i) => ({
      name,
      value: Math.round((count / total) * 1000) / 10,
      color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    }));
  }, [tickets]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { raised: number; open: number; closed: number; sortKey: number }>();
    tickets.forEach((t) => {
      const d = new Date(t.created);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const entry = map.get(key) ?? { raised: 0, open: 0, closed: 0, sortKey: d.getFullYear() * 12 + d.getMonth() };
      entry.raised += 1;
      if (t.status === "Open" || t.status === "Pending" || t.status === "Escalated") entry.open += 1;
      if (t.status === "Closed" || t.status === "Resolved") entry.closed += 1;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([month, v]) => ({ month, raised: v.raised, open: v.open, closed: v.closed }));
  }, [tickets]);

  const recentTickets = useMemo(
    () => [...tickets].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()).slice(0, 5),
    [tickets]
  );

  const isCustomer = user?.role === "customer";

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif", background: "#f0f2f8" }}>
      <Sidebar active="dashboard" />

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 bg-white shadow-sm flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-[#1a1f5e]">{getGreeting()}, {user ? firstName(user.name) : "there"}</h1>
            <p className="text-xs text-gray-400">Last server update 2 mins later</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
              <Clock size={13} className="text-purple-500" />
              <span className="text-xs font-medium text-[#1a1f5e]">Cron run</span>
              <span className="text-xs text-gray-400">Just now 1</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
              <SlidersHorizontal size={13} className="text-purple-500" />
              <span className="text-xs font-medium text-[#1a1f5e]">Sort By</span>
              <span className="text-xs text-gray-400">All Time</span>
            </div>
            <UserProfileChip />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <section>
            <div className="mb-3">
              <h2 className="text-sm font-bold text-[#1a1f5e]">Quick Overview</h2>
              <p className="text-xs text-gray-400">{isCustomer ? "A summary of your tickets" : "This is all over platform sales generated"}</p>
            </div>
            <div className="grid grid-cols-6 gap-3">
              <StatCard label={isCustomer ? "My Tickets" : "Total Tickets"} value={String(stats.total)} sub="All time" color={ACCENT} />
              <StatCard label="Open Tickets" value={String(stats.open)} sub="Awaiting first response" color={ACCENT5} />
              <StatCard label="Pending Tickets" value={String(stats.pending)} sub="Awaiting customer/agent" color={ACCENT4} />
              <StatCard label="Resolved Tickets" value={String(stats.resolved)} sub="All time" color={ACCENT3} />
              <StatCard label="Escalated Tickets" value={String(stats.escalated)} sub="Needs attention" color={ACCENT2} />
              <StatCard label="SLA Breaches" value={String(stats.breached)} sub="Past resolution deadline" color={stats.breached > 0 ? "#ef4444" : ACCENT6} />
            </div>
          </section>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-[#1a1f5e] mb-3">Tickets By Agent</h3>
              <div className="flex items-center gap-2">
                <PieChart width={140} height={140}>
                  <Pie data={byAgent} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" labelLine={false} label={renderCustomLabel}>
                    {byAgent.map((entry, i) => <Cell key={`pie-agent-${i}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
                <div className="flex flex-col gap-1">
                  {byAgent.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-[10px] text-gray-500 truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 border-t pt-3">
                <div className="text-center"><p className="text-base font-bold text-[#1a1f5e]">{stats.total}</p><p className="text-[10px] text-gray-400">All</p></div>
                <div className="text-center"><p className="text-base font-bold text-[#1a1f5e]">{stats.open}</p><p className="text-[10px] text-gray-400">Open Tickets</p></div>
                <div className="text-center"><p className="text-base font-bold text-[#1a1f5e]">{stats.closedOrResolved}</p><p className="text-[10px] text-gray-400">Closed Tickets</p></div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <MiniStat label="All Total" value={String(stats.total)} sub="All time" up={true} />
              <MiniStat label="Pending Tickets" value={String(stats.pending)} sub="All time" up={true} />
              <MiniStat label="Closed Tickets" value={String(stats.closed)} sub="All time" up={false} />
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-[#1a1f5e] mb-2">Tickets By Category</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <PieChart width={120} height={120}>
                    <Pie data={byCategory} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" startAngle={90} endAngle={-270}>
                      {byCategory.map((entry, i) => <Cell key={`pie-cat-${i}`} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-[#1a1f5e]">{stats.total}</span>
                    <span className="text-[9px] text-gray-400">Total Tickets</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {byCategory.map((item, i) => (
                    <div key={`cat-legend-${i}`} className="flex items-start gap-1.5">
                      <div className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0" style={{ background: item.color }} />
                      <div>
                        <p className="text-[10px] text-gray-500 leading-none">{item.name}</p>
                        <p className="text-[10px] font-semibold text-[#1a1f5e]">{item.value}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#1a1f5e]">Tickets Over Time</h3>
              <span className="text-xs text-gray-400">All Time</span>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={byMonth} barSize={8} barGap={2}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Bar dataKey="raised" fill={ACCENT} radius={[4, 4, 0, 0]} name="Raised" />
                <Bar dataKey="open" fill={ACCENT4} radius={[4, 4, 0, 0]} name="Open" />
                <Bar dataKey="closed" fill={ACCENT3} radius={[4, 4, 0, 0]} name="Closed" />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-2 border-t pt-3">
              {[{ color: ACCENT, count: String(stats.total), label: "Total Tickets" }, { color: ACCENT4, count: String(stats.open), label: "Open Tickets" }, { color: ACCENT3, count: String(stats.closedOrResolved), label: "Closed Tickets" }].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-xs font-bold text-[#1a1f5e]">{s.count}</span>
                  <span className="text-xs text-gray-400">{s.label}</span> 
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[#1a1f5e]">{isCustomer ? "My Recent Tickets" : "Recent Tickets"}</h3>
              <span className="text-xs text-gray-400">All Time</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b">
                  {["Ticket ID", "Full Name", "Email", "Created On", "Subject"].map((h) => (
                    <th key={h} className="text-left py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 font-semibold text-purple-600">{row.id}</td>
                    <td className="py-2.5 font-medium text-[#1a1f5e]">{row.customer}</td>
                    <td className="py-2.5 text-gray-500">{row.email}</td>
                    <td className="py-2.5 text-gray-500">{row.created}</td>
                    <td className="py-2.5 text-gray-500">{row.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}