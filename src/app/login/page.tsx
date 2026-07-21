'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleOtpRequest = async () => {
    if (!email) { setError("Please enter your email first"); return; }
    setError("");
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "forgot-password" }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Unable to send OTP"); return; }
      setOtpSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      router.push("/dashboard/inbox");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Unable to reset password"); return; }
      setResetSuccess(true);
      setTimeout(() => {
        setMode("login");
        setPassword("");
        setOtp("");
        setOtpSent(false);
        setResetSuccess(false);
        setError("");
      }, 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: "login" | "reset") => {
    setMode(next);
    setError("");
    setOtp("");
    setOtpSent(false);
    setResetSuccess(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 hero-bg flex-col justify-between p-12">
        <div>
          <span className="text-2xl font-bold text-green-600" style={{ fontFamily: "Sora, sans-serif" }}>
            Wexa AI
          </span>
        </div>
        <div>
          <h2 className="text-4xl font-extrabold leading-tight text-zinc-900" style={{ fontFamily: "Sora, sans-serif" }}>
            Welcome back to<br />
            <span className="gradient-text">Wexa AI</span>
          </h2>
          <p className="mt-4 text-zinc-500 text-base max-w-sm">
            Manage your inbox, contacts, campaigns, and AI assistant — all in one place.
          </p>
          <ul className="mt-8 space-y-3">
            {["AI-powered auto replies", "Shared team inbox", "WhatsApp broadcasts"].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-zinc-600">
                <CheckCircle2 size={18} className="text-green-600 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-zinc-400">© {new Date().getFullYear()} Wexa AI. All rights reserved.</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <span className="text-2xl font-bold text-green-600" style={{ fontFamily: "Sora, sans-serif" }}>Wexa AI</span>
          </div>

          {mode === "login" ? (
            <>
              <h1 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: "Sora, sans-serif" }}>Sign in</h1>
              <p className="mt-2 text-sm text-zinc-500">Welcome back! Enter your credentials to continue.</p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-700">Password</label>
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
                      className="text-xs font-semibold text-green-600 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign in"}
                  {!loading && <ArrowRight size={16} />}
                </button>

                <p className="text-center text-sm text-zinc-500">
                  Don&apos;t have an account?{" "}
                  <Link href="/signup" className="font-semibold text-green-600 hover:underline">
                    Create one
                  </Link>
                </p>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: "Sora, sans-serif" }}>Reset password</h1>
              <p className="mt-2 text-sm text-zinc-500">Enter your email, get an OTP, and set a new password.</p>

              <form className="mt-8 space-y-5" onSubmit={handleResetPassword}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a new password"
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>

                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-700">Email verification</p>
                      <p className="text-xs text-zinc-400 mt-0.5">We&apos;ll send a 6-digit code to your email.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleOtpRequest}
                      disabled={otpLoading}
                      className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                    >
                      {otpLoading ? "Sending..." : otpSent ? "Resend" : "Send OTP"}
                    </button>
                  </div>
                  {otpSent && (
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      className="mt-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20 tracking-widest text-center font-mono"
                    />
                  )}
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                {resetSuccess && (
                  <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                    Password reset successful! Redirecting to sign in...
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !otpSent}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Resetting..." : "Reset password"}
                  {!loading && <ArrowRight size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="w-full text-sm font-semibold text-zinc-500 hover:text-green-600 hover:underline"
                >
                  ← Back to sign in
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
