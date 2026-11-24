import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const ACCENT = "#5f63f2";
const SIDEBAR_BG = "#1a1f5e";
const SIDEBAR_TEXT = "#a0a5d4";

export function GeometricPanel() {
  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1a1aff 0%, #2d1b8e 40%, #0d0d6b 100%)" }} />

      {/* Top-left purple circle */}
      <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full opacity-70" style={{ background: "#6a0dad" }} />
      {/* Bottom-left purple half-circle */}
      <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full opacity-60" style={{ background: "#8b2fc9" }} />

      {/* Top-right dark square with diamonds */}
      <div className="absolute top-4 right-4 w-28 h-28 rounded-lg flex items-center justify-center gap-2" style={{ background: "#0d0d3b" }}>
        <div className="w-6 h-6 rotate-45" style={{ background: "#f59e0b" }} />
        <div className="w-6 h-6 rotate-45" style={{ background: "#f87171" }} />
      </div>

      {/* Horizontal lines */}
      <div className="absolute top-4 right-36 flex flex-col gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-1 rounded" style={{ width: `${60 - i * 5}px`, background: "rgba(99,179,237,0.7)" }} />
        ))}
      </div>

      {/* Dot grid top-right */}
      <div className="absolute top-36 right-4 grid gap-1" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: i % 3 === 0 ? "#4f46e5" : "rgba(99,179,237,0.3)" }} />
        ))}
      </div>

      {/* Teal rectangle */}
      <div className="absolute w-16 h-20 rounded-md" style={{ background: "#06b6d4", left: "30%", top: "45%" }} />

      {/* Yellow starburst */}
      <svg className="absolute" style={{ left: "42%", top: "38%", width: 60, height: 60 }} viewBox="0 0 60 60">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          return <line key={i} x1="30" y1="30" x2={30 + 28 * Math.cos(angle)} y2={30 + 28 * Math.sin(angle)} stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />;
        })}
        <circle cx="30" cy="30" r="8" fill="#fbbf24" />
      </svg>

      {/* Triangle */}
      <svg className="absolute" style={{ left: "18%", top: "38%", width: 50, height: 44 }} viewBox="0 0 50 44">
        <polygon points="25,0 50,44 0,44" fill="#4f46e5" />
      </svg>

      {/* Sparkle */}
      <svg className="absolute" style={{ right: "30%", top: "18%", width: 32, height: 32 }} viewBox="0 0 32 32">
        <line x1="16" y1="0" x2="16" y2="32" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="0" y1="16" x2="32" y2="16" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="5" y1="5" x2="27" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="27" y1="5" x2="5" y2="27" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>

      {/* Dot pattern */}
      <div className="absolute grid gap-1" style={{ right: "18%", top: "28%", gridTemplateColumns: "repeat(5,1fr)" }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(99,179,237,0.5)" }} />
        ))}
      </div>

      {/* Leaf */}
      <svg className="absolute" style={{ right: "22%", top: "14%", width: 40, height: 50 }} viewBox="0 0 40 50">
        <ellipse cx="20" cy="30" rx="10" ry="18" fill="#34d399" transform="rotate(-20,20,30)" />
        <ellipse cx="20" cy="30" rx="10" ry="18" fill="#059669" transform="rotate(20,20,30)" />
        <line x1="20" y1="10" x2="20" y2="48" stroke="#065f46" strokeWidth="2" />
      </svg>

      {/* X shape */}
      <svg className="absolute" style={{ right: "10%", top: "24%", width: 28, height: 28 }} viewBox="0 0 28 28">
        <line x1="0" y1="0" x2="28" y2="28" stroke="white" strokeWidth="3" strokeLinecap="round" />
        <line x1="28" y1="0" x2="0" y2="28" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* Sunburst */}
      <svg className="absolute" style={{ right: "6%", bottom: "30%", width: 60, height: 60 }} viewBox="0 0 60 60">
        {Array.from({ length: 10 }).map((_, i) => {
          const angle = (i * 36 * Math.PI) / 180;
          return <line key={i} x1="30" y1="30" x2={30 + 28 * Math.cos(angle)} y2={30 + 28 * Math.sin(angle)} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />;
        })}
      </svg>

      {/* Bottom-right circle */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-50" style={{ background: "#7c3aed" }} />

      {/* Wave lines */}
      <svg className="absolute bottom-10 left-1/4" width="80" height="24" viewBox="0 0 80 24">
        {[0, 8, 16].map((y) => (
          <path key={y} d={`M0,${y + 4} Q20,${y} 40,${y + 4} Q60,${y + 8} 80,${y + 4}`} fill="none" stroke="rgba(99,179,237,0.5)" strokeWidth="1.5" />
        ))}
      </svg>

      {/* Bottom dot grid */}
      <div className="absolute bottom-6 right-6 grid gap-1" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: "rgba(99,179,237,0.45)" }} />
        ))}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Login failed. Please try again.");
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    const result = await loginWithGoogle();
    setIsGoogleSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Google sign-in failed. Please try again.");
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="flex h-screen w-full" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* Left: Form */}
      <div className="flex flex-col justify-center w-full max-w-md px-12 bg-white shadow-xl z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: ACCENT }}>
            <span className="text-white text-sm font-bold">K</span>
          </div>
          <span className="font-bold text-base" style={{ color: SIDEBAR_BG }}>kabsTech</span>
        </div>

        <h1 className="text-2xl font-bold mb-1" style={{ color: "#1a1f5e" }}>Welcome back !</h1>
        <p className="text-sm text-gray-400 mb-7">Enter to get unlimited access to data &amp; information.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
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

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-3.5 h-3.5 accent-purple-600"
              />
              <span className="text-xs text-gray-500">Remember me</span>
            </label>
            <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="text-xs font-medium"
            style={{ color: ACCENT }}
          >
            Forgot your password ?
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-500 -mt-1" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg text-white text-sm font-semibold mt-1 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: ACCENT }}
          >
            {isSubmitting && <Loader2 size={15} className="animate-spin" />}
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">Or, Login with</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isGoogleSubmitting}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGoogleSubmitting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {isGoogleSubmitting ? "Connecting to Google..." : "Sign up with google"}
        </button>

        <p className="text-xs text-center text-gray-400 mt-5">
          Don&apos;t have an account ?{" "}
          <button type="button" onClick={() => navigate("/register")} className="font-semibold" style={{ color: ACCENT }}>Register here</button>
        </p>
      </div>

      {/* Right: Geometric art */}
      <div className="flex-1">
        <GeometricPanel />
      </div>
    </div>
  );
}
