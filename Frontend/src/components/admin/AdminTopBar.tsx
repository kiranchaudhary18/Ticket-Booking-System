"use client";

import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { ReactNode } from "react";

interface AdminTopBarProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function AdminTopBar({ title, description, action }: AdminTopBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-xl border border-[#E7E5E0] shadow-sm">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0B1020]">{title}</h1>
        {description && <p className="text-sm text-[#667085] mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-4 self-end sm:self-auto">
        {action}
        <div className="hidden md:block">
          <NotificationDropdown />
        </div>
      </div>
    </div>
  );
}
