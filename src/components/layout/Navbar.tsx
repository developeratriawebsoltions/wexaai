"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { name: "Features", href: "#features" },
  { name: "How it Works", href: "#how-it-works" },
  { name: "Pricing", href: "#pricing" },
  { name: "FAQ", href: "#faq" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, loading, logout } = useAuth();

  const isLoggedIn = !loading && !!user;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo/wexaai.png"
            alt="Wexa AI Logo"
            width={140}
            height={50}
            priority
            className="h-auto w-auto max-w-xs"
            style={{ maxWidth: '140px', height: 'auto' }}
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-base font-bold text-zinc-600 transition hover:text-green-600"
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Desktop Buttons */}
        <div className="hidden items-center gap-4 lg:flex">
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard/inbox"
                className="text-base font-bold text-zinc-700 transition hover:text-green-600"
              >
                Dashboard
              </Link>
              <button
                onClick={logout}
                className="rounded-xl bg-green-600 px-5 py-3 text-base font-bold text-white transition hover:bg-green-700"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-base font-bold text-zinc-700 transition hover:text-green-600"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-green-600 px-5 py-3 text-base font-bold text-white transition hover:bg-green-700"
              >
                Start Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 lg:hidden"
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t border-zinc-200 bg-white lg:hidden">
          <div className="container flex flex-col py-6">
            {navLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="py-4 text-lg font-bold text-zinc-700 transition hover:text-green-600"
              >
                {item.name}
              </Link>
            ))}

            <div className="mt-6 flex flex-col gap-3">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard/inbox"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-zinc-300 px-4 py-3 text-center font-bold text-lg"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { setIsOpen(false); logout(); }}
                    className="rounded-xl bg-green-600 px-4 py-3 text-center font-bold text-lg text-white hover:bg-green-700"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl border border-zinc-300 px-4 py-3 text-center font-bold text-lg"
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setIsOpen(false)}
                    className="rounded-xl bg-green-600 px-4 py-3 text-center font-bold text-lg text-white hover:bg-green-700"
                  >
                    Start Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
