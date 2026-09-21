"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { 
  Ticket, 
  LayoutDashboard, 
  Calendar, 
  Heart, 
  Bell, 
  User, 
  LogOut,
  Menu,
  X
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", href: "/customer/dashboard", icon: LayoutDashboard },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Bookings", href: "/customer/bookings", icon: Ticket },
  { name: "Wishlist", href: "/customer/wishlist", icon: Heart },
  { name: "Notifications", href: "/customer/notifications", icon: Bell },
  { name: "Profile", href: "/customer/profile", icon: User },
];

export function CustomerSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full w-full">
      {/* Brand & Profile Area */}
      <div className={cn("mb-6 px-4 flex-shrink-0", !isMobile && "md:px-2 lg:px-6 md:text-center lg:text-left")}>
        <Link href="/" className={cn("group flex shrink-0 items-center gap-3 mb-10", !isMobile && "md:hidden lg:flex")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#3B41C5] text-white shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
            <Ticket className="h-[20px] w-[20px]" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-[#0A1526]">TicketMaster</span>
        </Link>
        
        <div className={cn(!isMobile && "md:hidden lg:block")}>
          <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-[#c29665] mb-1">
            CUSTOMER
          </span>
          <h2 className="text-lg font-extrabold tracking-tight text-[#0A1526] truncate">
            {user?.name || "Welcome"}
          </h2>
        </div>

        {!isMobile && (
          <div className="hidden md:flex lg:hidden justify-center items-center h-10 w-10 rounded-full bg-[#EEF2FF] mx-auto text-[#3B41C5] font-bold relative overflow-hidden mb-2">
            {(user?.name || "C").charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={cn("px-4 lg:px-6 mb-6", !isMobile && "md:px-2")}>
        <div className="h-px w-full bg-slate-100" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 w-full px-4 md:px-2 lg:px-4 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={cn(
                "group flex items-center py-3 font-medium rounded-[12px] transition-all duration-200",
                isMobile ? "px-4 text-sm" : "md:justify-center lg:justify-start px-4 md:px-0 lg:px-4 text-[15px]",
                isActive
                  ? "bg-[#EEF2FF] text-[#3B41C5]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-[#0A1526]"
              )}
              title={!isMobile ? item.name : undefined}
            >
              <Icon
                className={cn(
                  "flex-shrink-0 h-[22px] w-[22px] transition-colors",
                  isMobile ? "mr-3" : "md:mr-0 lg:mr-3",
                  isActive ? "text-[#3B41C5]" : "text-slate-400 group-hover:text-[#3B41C5]"
                )}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className={cn(isMobile ? "block" : "hidden lg:block")}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Divider and Logout */}
      <div className="mt-auto flex-shrink-0">
        <div className={cn("px-4 lg:px-6 mb-4", !isMobile && "md:px-2")}>
          <div className="h-px w-full bg-slate-100" />
        </div>
        <div className="px-4 md:px-2 lg:px-4 pb-4">
          <button
            onClick={handleLogout}
            title={!isMobile ? "Log out" : undefined}
            className={cn(
              "group flex w-full items-center py-3 font-medium rounded-[12px] text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors",
              isMobile ? "px-4 text-sm" : "md:justify-center lg:justify-start px-4 md:px-0 lg:px-4 text-[15px]"
            )}
          >
            <LogOut className={cn("flex-shrink-0 h-[22px] w-[22px] text-slate-400 group-hover:text-red-500 transition-colors", isMobile ? "mr-3" : "md:mr-0 lg:mr-3")} strokeWidth={2} aria-hidden="true" />
            <span className={cn(isMobile ? "block" : "hidden lg:block")}>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header / Hamburger */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-20">
        <span className="font-semibold text-lg text-[#0A1526]">Dashboard</span>
        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Toggle Menu"
            className="text-slate-600"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex w-full max-w-[260px] flex-col overflow-y-auto bg-white pt-6 pb-4 shadow-2xl z-40 h-full">
            <div className="absolute right-0 top-0 -mr-12 pt-4">
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none bg-white/10 hover:bg-white/20 text-white"
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

      {/* Desktop/Tablet Sidebar */}
      <div className="hidden md:flex flex-col fixed inset-y-0 left-0 z-40 md:w-20 lg:w-[260px] border-r border-slate-100 bg-white pt-8 pb-4 transition-all duration-300 h-screen shadow-[1px_0_20px_rgba(0,0,0,0.02)]">
        {renderSidebarContent(false)}
      </div>
    </>
  );
}
