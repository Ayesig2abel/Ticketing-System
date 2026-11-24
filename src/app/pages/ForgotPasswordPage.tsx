import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../lib/supabase";
import { GeometricPanel } from "./LoginPage";

const ACCENT = "#5f63f2";
const SIDEBAR_BG = "#1a1f5e";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // If this page was opened from a Supabase invite or password-recovery
  // email link, supabase-js automatically parses the access token out of
  // the URL fragment (#access_token=...&type=invite|recovery) and
  // establishes a real session for that specific user before this
  // component even mounts. When that's the case, we already know who the
  // user is — skip the "enter your email" step and go straight to letting
  // them set a password.
  useEffect(() => {
    let active = true;

    const checkForInviteOrRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;

      if (session?.user?.email) {
        setEmail(session.user.email);
        setStep("reset");
      }
      setCheckingSession(false);
    };

    checkForInviteOrRecoverySession();

    // Belt-and-suspenders: supabase-js parses the URL hash asynchronously,
    // so on a first-ever page load the session above can sometimes still be
    // null even though a token is present. This listener catches it the
    // moment the session actually becomes available.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session?.user?.email) {
        setEmail(session.user.email);
        setStep("reset");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    // There's no real email server here, so we skip straight to letting them
    // set a new password — in a real app this step would send a reset link instead.
    setStep("reset");
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session || session.user.email?.toLowerCase() !== email.toLowerCase()) {
    setError("This invite link is invalid, expired, or you're logged in as someone else. Please log out and try the link again.");
    return;
  }
  // ...rest unchanged

    setIsSubmitting(true);
    const result = await resetPassword(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Couldn't reset password. Please try again.");
      return;
    }

    setStep("done");
  };

  if (checkingSession) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ fontFamily: "Inter, sans-serif" }}>
        <Loader2 size={24} className="animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="flex flex-col justify-center w-full max-w-md px-12 bg-white shadow-xl z-10">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
            <span className="text-white text-sm font-bold">K</span>
          </div>
          <span className="font-bold text-base" style={{ color: SIDEBAR_BG }}>kabsTech</span>
        </div>

        {step === "email" && (
          <>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#1a1f5e" }}>Reset your password</h1>
            <p className="text-sm text-gray-400 mb-7">Enter the email on your account to continue.</p>

            <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="Enter your mail address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-400 transition-colors bg-white"
                  style={{ color: "#1a1f5e" }}
                />
              </div>

              {error && <p className="text-xs text-red-500 -mt-1" role="alert">{error}</p>}

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg text-white text-sm font-semibold mt-1 hover:opacity-90 transition-opacity"
                style={{ background: ACCENT }}
              >
                Continue
              </button>
            </form>
          </>
        )}

        {step === "reset" && (
          <>
            <h1 className="text-2xl font-bold mb-1" style={{ color: "#1a1f5e" }}>Set a new password</h1>
            <p className="text-sm text-gray-400 mb-7">For {email}</p>

            <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">New Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-400 transition-colors bg-white pr-10"
                    style={{ color: "#1a1f5e" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600">Confirm Password <span className="text-red-500">*</span></label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-400 transition-colors bg-white"
                  style={{ color: "#1a1f5e" }}
                />
              </div>

              {error && <p className="text-xs text-red-500 -mt-1" role="alert">{error}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-lg text-white text-sm font-semibold mt-1 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: ACCENT }}
              >
                {isSubmitting && <Loader2 size={15} className="animate-spin" />}
                {isSubmitting ? "Updating..." : "Update Password"}
              </button>
            </form>
          </>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center text-center gap-3 py-8">
            <CheckCircle2 size={40} style={{ color: "#10b981" }} />
            <h1 className="text-xl font-bold" style={{ color: "#1a1f5e" }}>Password updated</h1>
            <p className="text-sm text-gray-400">You can now log in with your new password.</p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 rounded-lg text-white text-sm font-semibold mt-3 hover:opacity-90 transition-opacity"
              style={{ background: ACCENT }}
            >
              Back to Login
            </button>
          </div>
        )}

        {step !== "done" && (
          <p className="text-xs text-center text-gray-400 mt-5">
            Remembered it?{" "}
            <button type="button" onClick={() => navigate("/")} className="font-semibold" style={{ color: ACCENT }}>
              Log in here
            </button>
          </p>
        )}
      </div>

      <div className="flex-1">
        <GeometricPanel />
      </div>
    </div>
  );
}