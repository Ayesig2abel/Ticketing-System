import { useState, type ComponentType } from "react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard, MessageSquare, Ticket, ChevronDown, ChevronRight,
  Users, UserCircle, Settings, HardDrive, BookOpen,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

const SIDEBAR_BG = "#1a1f5e";
const SIDEBAR_ACTIVE = "#2d3280";
const SIDEBAR_TEXT = "#a0a5d4";
const ACCENT = "#5f63f2";

export type NavKey =
  | "dashboard"
  | "messenger"
  | "tickets"
  | "my-tickets"
  | "raise-ticket"
  | "agents"
  | "users"
  | "assets"
  | "kb"
  | "settings";

interface SidebarProps {
  /** Which nav item should render as active/highlighted for the current page. */
  active: NavKey;
}

/**
 * Shared left navigation used by every authenticated page.
 * Centralizes role-gating (Agent Management / Manage User / All Tickets)
 * and sign-out so each page doesn't duplicate (and risk diverging on) this logic.
 */
export function Sidebar({ active }: SidebarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isTicketSection = active === "tickets" || active === "my-tickets" || active === "raise-ticket";
  const [ticketOpen, setTicketOpen] = useState(isTicketSection);

  const canSeeAllTickets = user?.role === "agent" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const handleSignOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  function NavButton({
    navKey, label, Icon, path,
  }: { navKey: NavKey; label: string; Icon: ComponentType<{ size?: number }>; path: string }) {
    const isActive = active === navKey;
    return (
      <button
        onClick={() => navigate(path)}
        className="flex items-center gap-2 w-full px-2 py-2 rounded-lg mb-0.5 text-sm font-medium transition-colors"
        style={{ background: isActive ? SIDEBAR_ACTIVE : "transparent", color: isActive ? "#fff" : SIDEBAR_TEXT }}
      >
        <Icon size={15} />{label}
      </button>
    );
  }

  function SubNavButton({ navKey, label, path }: { navKey: NavKey; label: string; path: string }) {
    const isActive = active === navKey;
    return (
      <button
        onClick={() => navigate(path)}
        className="block w-full text-left text-[11px] py-1 px-1 transition-colors"
        style={{ color: isActive ? "#fff" : SIDEBAR_TEXT, fontWeight: isActive ? 600 : 400 }}
      >
        {label}
      </button>
    );
  }

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col py-5 px-3 overflow-y-auto" style={{ background: SIDEBAR_BG }}>
      <div className="flex items-center gap-2 mb-6 px-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
          <span className="text-white text-xs font-bold">K</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">kabsTech</span>
      </div>

      <p className="text-[10px] uppercase tracking-widest mb-2 px-2" style={{ color: SIDEBAR_TEXT }}>Menu</p>
      <NavButton navKey="dashboard" label="Dashboard" Icon={LayoutDashboard} path="/dashboard" />
      <NavButton navKey="messenger" label="Messenger" Icon={MessageSquare} path="/messenger" />

      <p className="text-[10px] uppercase tracking-widest mt-4 mb-2 px-2" style={{ color: SIDEBAR_TEXT }}>Events &amp; Users</p>
      <button
        className="flex items-center justify-between w-full px-2 py-2 rounded-lg mb-0.5 text-sm font-medium transition-colors"
        style={{ background: isTicketSection ? SIDEBAR_ACTIVE : "transparent", color: isTicketSection ? "#fff" : SIDEBAR_TEXT }}
        onClick={() => setTicketOpen((v) => !v)}
      >
        <div className="flex items-center gap-2"><Ticket size={15} />Tickets</div>
        {ticketOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {ticketOpen && (
        <div className="ml-4 border-l pl-3 mb-1" style={{ borderColor: "rgba(160,165,212,0.3)" }}>
          {canSeeAllTickets && <SubNavButton navKey="tickets" label="All Tickets" path="/tickets" />}
          <SubNavButton navKey="my-tickets" label="My Ticket" path="/my-tickets" />
          <SubNavButton navKey="raise-ticket" label="Raise on Behalf" path="/raise-ticket" />
        </div>
      )}

      {isAdmin && (
        <>
          <NavButton navKey="agents" label="Agent Management" Icon={Users} path="/agents" />
          <NavButton navKey="users" label="Manage User" Icon={UserCircle} path="/users" />
        </>
      )}
      <NavButton navKey="kb" label="Knowledge Base" Icon={BookOpen} path="/kb" />
      {(isAdmin || canSeeAllTickets) && (
        <NavButton navKey="assets" label="Asset Management" Icon={HardDrive} path="/assets" />
      )}
      {isAdmin && (
        <NavButton navKey="settings" label="Settings" Icon={Settings} path="/settings" />
      )}

      <button
        onClick={handleSignOut}
        className="mt-auto mx-2 py-2 rounded-lg text-xs font-medium text-white opacity-60 hover:opacity-100 transition-opacity border border-white/20"
      >
        Sign Out
      </button>
    </aside>
  );
}
