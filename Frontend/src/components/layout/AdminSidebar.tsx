"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, 
  Users,
  CalendarDays,
  Tags,
  Ticket, 
  BarChart3,
  UserCircle,
  LogOut,
  Menu,
  X
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Events", href: "/admin/events", icon: CalendarDays },
  { name: "Categories", href: "/admin/categories", icon: Tags },
  { name: "Bookings", href: "/admin/bookings", icon: Ticket },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Profile", href: "/admin/profile", icon: UserCircle },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-white">
      {/* Branding Area */}
      <div className="px-6 py-6 border-b border-[#E7E5E0]">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-6 w-6 text-[#5B5CE2]" />
          <span className="text-xl font-bold tracking-tight text-[#0B1020]">TicketMaster</span>
        </Link>
        <div className="mt-4 flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#667085]">Admin Panel</span>
          <span className="text-sm font-medium text-[#0B1020] truncate mt-1">
            {user?.name || "System Admin"}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "group flex items-center px-3 py-2.5 font-medium rounded-md transition-colors text-sm",
                isActive
                  ? "bg-[#5B5CE2]/10 text-[#5B5CE2]"
                  : "text-[#667085] hover:bg-[#F8F7F4] hover:text-[#0B1020]"
              )}
              title={!isMobile ? item.name : undefined}
            >
              <Icon
                className={cn(
                  "flex-shrink-0 h-5 w-5 mr-3 transition-colors",
                  isActive ? "text-[#5B5CE2]" : "text-[#667085] group-hover:text-[#0B1020]"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-[#E7E5E0]">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center px-3 py-2.5 font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors text-sm"
        >
          <LogOut className="flex-shrink-0 h-5 w-5 mr-3" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header / Hamburger */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[#E7E5E0] bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-[#5B5CE2]" />
          <span className="font-semibold text-lg text-[#0B1020]">TicketMaster</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle Menu"
          className="text-[#0B1020]"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileOpen(false)} 
          />
          <div className="relative flex w-full max-w-[260px] flex-col shadow-xl z-40 bg-white border-r border-[#E7E5E0]">
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/20"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </Button>
            </div>
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-20 bg-white border-r border-[#E7E5E0]">
        {renderSidebarContent(false)}
      </div>
    </>
  );
}
