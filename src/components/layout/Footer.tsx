import Link from "next/link";
import { Mail } from "lucide-react";

const footerLinks = {
  Product: [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "AI Agent", href: "#" },
    { name: "Broadcast", href: "#" },
    { name: "Analytics", href: "#" },
  ],
  Company: [
    { name: "About", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Careers", href: "#" },
    { name: "Contact", href: "#" },
  ],
  Resources: [
    { name: "Documentation", href: "#" },
    { name: "API Reference", href: "#" },
    { name: "Help Center", href: "#" },
    { name: "Status", href: "#" },
  ],
  Legal: [
    { name: "Privacy Policy", href: "#" },
    { name: "Terms of Service", href: "#" },
    { name: "Cookie Policy", href: "#" },
    { name: "Refund Policy", href: "#" },
  ],
};

const socialLinks = [
  {
    label: "Facebook",
    href: "#",
    svg: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
  },
  {
    label: "X",
    href: "#",
    svg: "M18 6 6 18M6 6l12 12",
  },
  {
    label: "LinkedIn",
    href: "#",
    svg: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  },
  {
    label: "GitHub",
    href: "#",
    svg: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22",
  },
];

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-white">
      <div className="container py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          {/* Company */}
          <div>
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-xl font-bold">
                W
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  Wexa <span className="text-green-400">AI</span>
                </h2>

                <p className="text-sm text-zinc-400">
                  WhatsApp AI Platform
                </p>
              </div>
            </Link>

            <p className="mt-6 leading-7 text-zinc-400">
              Automate customer conversations, manage broadcasts,
              empower your support team, and grow your business with
              AI-powered WhatsApp automation.
            </p>

            {/* Newsletter */}

            <div className="mt-8">
              <h4 className="mb-3 font-semibold">
                Subscribe to our newsletter
              </h4>

              <div className="flex overflow-hidden rounded-xl bg-zinc-900">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none"
                />

                <button className="bg-green-600 px-5 hover:bg-green-700">
                  <Mail size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Columns */}

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-6 text-lg font-semibold">
                {title}
              </h3>

              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-zinc-400 transition hover:text-green-400"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}

        <div className="my-12 h-px bg-zinc-800" />

        {/* Bottom Footer */}

        <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
          <p className="text-center text-sm text-zinc-500 lg:text-left">
            © {new Date().getFullYear()} Wexa AI. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            {socialLinks.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="rounded-xl bg-zinc-900 p-3 transition hover:bg-green-600"
                aria-label={item.label}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.svg} />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}