'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Mail } from "lucide-react";
import Navbar from "@/components/layout/Navbar";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose: "signup" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to send OTP");
  };

  const handleContinue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || !businessName || !email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setOtpLoading(true);
    try {
      await sendOtp();
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setOtpLoading(true);
    try {
      await sendOtp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!otp) { setError("Please enter the OTP"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, businessName, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong"); return; }
      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-[32px] border border-zinc-200/70 bg-white shadow-2xl p-8 lg:p-12">
          <div className="mb-8 text-center lg:hidden">
            <span className="text-2xl font-bold text-green-600" style={{ fontFamily: "Sora, sans-serif" }}>Wexa AI</span>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`h-1.5 w-8 rounded-full transition-all ${step >= 1 ? "bg-green-600" : "bg-zinc-200"}`} />
            <div className={`h-1.5 w-8 rounded-full transition-all ${step >= 2 ? "bg-green-600" : "bg-zinc-200"}`} />
          </div>

          {step === 1 ? (
            <>
              <h1 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: "Sora, sans-serif" }}>Create your account</h1>
              <p className="mt-2 text-sm text-zinc-500">Start your free trial. No credit card needed.</p>

              <form className="mt-8 space-y-5" onSubmit={handleContinue}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-zinc-700">Business name</label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="ABC Electronics"
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-zinc-700">Full name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                </div>

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
                  <label className="text-sm font-medium text-zinc-700">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
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
                  disabled={otpLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {otpLoading ? "Sending code..." : "Continue"}
                  {!otpLoading && <ArrowRight size={16} />}
                </button>

                <p className="text-center text-sm text-zinc-500">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-green-600 hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-green-50 mb-6">
                <Mail size={22} className="text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-zinc-900" style={{ fontFamily: "Sora, sans-serif" }}>Check your email</h1>
              <p className="mt-2 text-sm text-zinc-500">
                We sent a 6-digit code to <span className="font-medium text-zinc-700">{email}</span>
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-zinc-700">Verification code</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xl text-zinc-900 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20 tracking-[0.5em] text-center font-mono"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating account..." : "Verify & create account"}
                  {!loading && <ArrowRight size={16} />}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setOtp(""); setError(""); }}
                    className="text-zinc-500 hover:text-zinc-700"
                  >
                    ← Change details
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={otpLoading}
                    className="font-semibold text-green-600 hover:underline disabled:opacity-50"
                  >
                    {otpLoading ? "Sending..." : "Resend code"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
