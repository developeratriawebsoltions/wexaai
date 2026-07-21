"use client";

import Link from "next/link";
import { ArrowLeft, Clock3 } from "lucide-react";

export default function ZapierPage() {
  return (
    <div className="p-6 w-full">
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/integrations" className="flex items-center gap-1 hover:text-gray-700">
          <ArrowLeft size={14} /> Back
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-amber-600">
          <Clock3 size={24} />
          <h1 className="text-2xl font-semibold text-gray-900">Zapier</h1>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          This integration is currently being prepared. Coming soon, you’ll be able to connect Zapier and build your automations here.
        </p>
      </div>
    </div>
  );
}
