"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [info, setInfo] = useState<{ email: string; workspaceName: string; role: string; userExists: boolean } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/workspace/invite/accept?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInfo(d);
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/workspace/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name: name || undefined, password: password || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSubmitting(false); return; }
    router.replace("/dashboard/inbox");
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  );

  if (error && !info) return (
    <div className="flex h-screen items-center justify-center px-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900 mb-2">Invalid Invite</p>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen items-center justify-center bg-[#f0f2f5] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-xl font-bold text-white">W</div>
          <h1 className="text-xl font-bold text-gray-900">Join {info?.workspaceName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            You've been invited as <span className="font-semibold capitalize text-green-700">{info?.role}</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">{info?.email}</p>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

        <form onSubmit={handleAccept} className="space-y-3">
          {!info?.userExists && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Your Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Create Password</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-400"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? "Joining..." : info?.userExists ? "Accept & Join Workspace" : "Create Account & Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
