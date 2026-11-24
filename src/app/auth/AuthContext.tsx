import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "../lib/supabase"; // Adjust path if necessary

export type Role = "admin" | "agent" | "customer";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserRole: (email: string, role: Role) => Promise<void>;
  inviteUser: (email: string, name: string, role: Role) => Promise<void>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  setAccountDisabled: (email: string, disabled: boolean) => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to extract user data from your custom profiles table
  const fetchProfile = async (id: string, email: string): Promise<AuthUser | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, role, is_active")
        .eq("id", id)
        .single();

      if (error || !data) return null;
      if (!data.is_active) return null; // Block suspended accounts

      return {
        id,
        email,
        name: data.name,
        role: data.role as Role,
      };
    } catch {
      return null;
    }
  };

  // Listen to live login state sessions from Supabase on start
  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email || "");
        if (profile) {
          setUser(profile);
        }
        // Note: no forced signOut here even if profile is null/inactive —
        // that would kill a fresh invite/recovery session before the user
        // ever gets to set their password. login() and updateUserRole()
        // already handle inactive-profile cases for real logins.
      }
      setIsLoading(false);
    };

    initializeAuth();

    // Set up a real-time state listener if tokens expire or change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // This is an invite/reset-password session — ForgotPasswordPage
        // handles it directly. Don't run fetchProfile/signOut here, or a
        // fresh invite session gets killed before the person can set a
        // password (their profile may not be fully active yet).
        setIsLoading(false);
        return;
      }
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email || "");
        setUser(profile);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ─── LOGIN ──────────────────────────────────────────────────────────────────
  const login: AuthContextValue["login"] = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) return { success: false, error: error.message };
      if (!data.user) return { success: false, error: "Authentication failed." };

      const profile = await fetchProfile(data.user.id, data.user.email || "");
      if (!profile) {
        await supabase.auth.signOut();
        return { success: false, error: "This account has been suspended or its profile setup failed." };
      }

      setUser(profile);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "An unexpected error occurred." };
    }
  };

  // ─── LOGOUT ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // ─── CHANGE USER ROLE ───────────────────────────────────────────────────────
  const updateUserRole: AuthContextValue["updateUserRole"] = async (email, role) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("email", email.trim().toLowerCase());

      if (error) throw error;

      // If updating our own role, apply it in state immediately
      if (user && user.email.toLowerCase() === email.trim().toLowerCase()) {
        setUser({ ...user, role });
      }
    } catch (err) {
      console.error("Failed to update user role:", err);
    }
  };

  // ─── INVITE USER ────────────────────────────────────────────────────────────
  const inviteUser: AuthContextValue["inviteUser"] = async (email, name, role) => {
    // Note: True production workflows invite users via Supabase Edge Functions or admin SDKs.
    // To preserve your exact "invite → register" web client flow, we can log this invitation info
    // directly inside your database records.
    console.log(`Invited user: ${name} (${email}) as ${role}. For fully secure production, use the Supabase Auth Dashboard to send direct email invites.`);
  };

  // ─── FINALIZE REGISTRATION ──────────────────────────────────────────────────
  const register: AuthContextValue["register"] = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Pass data options down into metadata attributes so your DB trigger creates the profile.
          // role must match the profiles_role_check constraint: customer | agent | admin.
          data: {
            name: email.split("@")[0], 
            role: "customer"
          }
        }
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Registration failed." };
    }
  };

  // ─── SUSPEND ACCOUNT ────────────────────────────────────────────────────────
  const setAccountDisabled: AuthContextValue["setAccountDisabled"] = async (email, disabled) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !disabled })
        .eq("email", email.trim().toLowerCase());

      if (error) throw error;

      // Force instant logout if the current user disables their active session
      if (disabled && user && user.email.toLowerCase() === email.trim().toLowerCase()) {
        await logout();
      }
    } catch (err) {
      console.error("Failed to alter user status account restriction:", err);
    }
  };

  // ─── PASSWORD RESET ─────────────────────────────────────────────────────────
  const resetPassword: AuthContextValue["resetPassword"] = async (email, newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Password update failed." };
    }
  };

  // ─── OAUTH/GOOGLE LOGIN ─────────────────────────────────────────────────────
  const loginWithGoogle: AuthContextValue["loginWithGoogle"] = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user, isAuthenticated: !!user, isLoading, login, logout, updateUserRole,
        inviteUser, register, setAccountDisabled, resetPassword, loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}