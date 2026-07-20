'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, businessName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-app-surface text-app-foreground flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl rounded-3xl border border-app-border bg-white/95 p-10 shadow-app">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.3em] text-app-muted">Create account</p>
          <h1 className="mt-4 text-4xl font-bold text-app-brand">Get started with Wexa</h1>
          <p className="mt-3 max-w-md text-app-muted">
            Register now and start sending broadcasts, organizing contacts, and using your AI agent.
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Business name
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="ABC Electronics"
              className="rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-foreground outline-none transition focus:border-app-brand focus:ring-2 focus:ring-app-brand/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Full name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-foreground outline-none transition focus:border-app-brand focus:ring-2 focus:ring-app-brand/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-foreground outline-none transition focus:border-app-brand focus:ring-2 focus:ring-app-brand/20"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="rounded-2xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-foreground outline-none transition focus:border-app-brand focus:ring-2 focus:ring-app-brand/20"
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-app-brand px-6 py-3 text-sm font-semibold text-app-brand-foreground shadow-app transition hover:bg-app-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
          <p className="text-center text-sm text-app-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-app-brand hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
