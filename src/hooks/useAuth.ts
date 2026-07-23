"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthWorkspace {
  id: string;
  name: string;
  slug: string;
  plan?: string;
}

export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspace, setWorkspace] = useState<AuthWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const isDashboard = pathname?.startsWith("/dashboard") ?? false;

    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => {
        if (!r.ok) {
          if (isDashboard) router.replace("/login");
          setLoading(false);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        const userData = d.user ?? { id: d.id, name: d.name, email: d.email };
        const workspaceData = d.workspace ?? (Array.isArray(d.workspaces) && d.workspaces.length > 0 ? d.workspaces[0] : null);
        setUser(userData);
        setWorkspace(workspaceData);
        setLoading(false);
      })
      .catch(() => {
        if (isDashboard) router.replace("/login");
        setLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
  };

  const token = "cookie";

  return { token, user, workspace, loading, logout };
}
