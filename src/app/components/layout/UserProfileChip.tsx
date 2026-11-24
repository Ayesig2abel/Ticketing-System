import { useAuth } from "../../auth/AuthContext";

const ACCENT = "#5f63f2";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  agent: "Agent",
  customer: "Customer",
};

export function firstName(fullName: string) {
  return fullName.split(" ")[0];
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function initials(fullName: string) {
  return fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

/**
 * Avatar + name + role chip shown in the header of every authenticated page.
 * Pulls the real logged-in user from AuthContext, so it's always accurate
 * and there's only one place to update if the design changes.
 */
export function UserProfileChip() {
  const { user } = useAuth();

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: ACCENT }}>
        {user ? initials(user.name) : "?"}
      </div>
      <div className="hidden md:block">
        <p className="text-xs font-semibold text-[#1a1f5e] leading-none">{user?.name ?? "Guest"}</p>
        <p className="text-[10px] text-gray-400">
          @{user ? (ROLE_LABELS[user.role] ?? user.role).toLowerCase() : "guest"}
        </p>
      </div>
    </div>
  );
}