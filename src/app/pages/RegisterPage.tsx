import { useState } from "react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { GeometricPanel } from "./LoginPage";

const ACCENT = "#5f63f2";
const SIDEBAR_BG = "#1a1f5e";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !confirmPassword) {
      setError("Please fill in every field.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    const result = await register(email, password);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? "Registration failed. Please try again.");
      return;
    }

    navigate("/dashboard", { replace: true });
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

        <h1 className="text-2xl font-bold mb-1" style={{ color: "#1a1f5e" }}>Complete your registration</h1>
        <p className="text-sm text-gray-400 mb-7">
          Enter the email an admin invited you with, and set a password to activate your account.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Invited Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="the email your invite was sent to"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-400 transition-colors bg-white"
              style={{ color: "#1a1f5e" }}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600">
              Create Password <span className="text-red-500">*</span>
            </label>
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
            <label className="text-xs font-semibold text-gray-600">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-purple-400 transition-colors bg-white"
              style={{ color: "#1a1f5e" }}
            />
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
            {isSubmitting ? "Creating account..." : "Activate Account"}
          </button>
        </form>

        <p className="text-xs text-center text-gray-400 mt-5">
          Already registered?{" "}
          <button type="button" onClick={() => navigate("/")} className="font-semibold" style={{ color: ACCENT }}>
            Log in here
          </button>
        </p>
      </div>

      {/* Right: Geometric art */}
      <div className="flex-1">
        <GeometricPanel />
      </div>
    </div>
  );
}
