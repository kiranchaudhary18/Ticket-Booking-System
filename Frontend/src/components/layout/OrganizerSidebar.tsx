"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { 
  LayoutDashboard, 
  CalendarDays, 
  MapPin, 
  Ticket, 
  ScanLine, 
  User, 
  LogOut,
  Menu,
  X,
  Ticket as TicketIcon
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useOrganizerProfile } from "@/contexts/OrganizerProfileContext";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Dashboard", href: "/organizer/dashboard", icon: LayoutDashboard },
  { name: "Events", href: "/organizer/events", icon: CalendarDays },
  { name: "Venues", href: "/organizer/venues", icon: MapPin },
  { name: "Bookings", href: "/organizer/bookings", icon: Ticket },
  { name: "Check-in", href: "/organizer/check-in", icon: ScanLine },
  { name: "Profile", href: "/organizer/profile", icon: User },
];

export function OrganizerSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { profile } = useOrganizerProfile();
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
    <div className="flex flex-col h-full w-full">
      {/* Brand & Profile Area */}
      <div className={cn("mb-6 px-4 flex-shrink-0", !isMobile && "md:px-2 lg:px-6 md:text-center lg:text-left")}>
        <Link href="/organizer/dashboard" className={cn("group flex shrink-0 items-center gap-3 mb-10", !isMobile && "md:hidden lg:flex")}>
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#5B5CE2] text-white shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
            <TicketIcon className="h-[20px] w-[20px]" strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-[#0B1020]">TicketMaster</span>
        </Link>
        
        <div className={cn(!isMobile && "md:hidden lg:flex lg:items-center lg:gap-3")}>
          <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-[#F8F7F4] flex items-center justify-center border border-[#E7E5E0]">
            {profile?.profile_picture ? (
              <Image 
                src={profile.profile_picture} 
                alt="Profile" 
                width={40} 
                height={40} 
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-[#5B5CE2] font-bold">{(user?.name || "O").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-[#C9A86A] mb-1">
              ORGANIZER
            </span>
            <h2 className="text-sm font-extrabold tracking-tight text-[#0B1020] truncate">
              {user?.name || "Welcome"}
            </h2>
          </div>
        </div>

        {!isMobile && (
          <div className="hidden md:flex lg:hidden justify-center items-center h-10 w-10 rounded-full overflow-hidden bg-[#F8F7F4] mx-auto border border-[#E7E5E0] relative mb-2">
            {profile?.profile_picture ? (
              <Image 
                src={profile.profile_picture} 
                alt="Profile" 
                width={40} 
                height={40} 
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-[#5B5CE2] font-bold">{(user?.name || "O").charAt(0).toUpperCase()}</span>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={cn("px-4 lg:px-6 mb-6", !isMobile && "md:px-2")}>
        <div className="h-px w-full bg-[#E7E5E0]" />
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
                  ? "bg-[#5B5CE2]/10 text-[#5B5CE2]"
                  : "text-[#667085] hover:bg-[#F8F7F4] hover:text-[#0B1020]"
              )}
              title={!isMobile ? item.name : undefined}
            >
              <Icon
                className={cn(
                  "flex-shrink-0 h-[22px] w-[22px] transition-colors",
                  isMobile ? "mr-3" : "md:mr-0 lg:mr-3",
                  isActive ? "text-[#5B5CE2]" : "text-[#667085] group-hover:text-[#5B5CE2]"
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
          <div className="h-px w-full bg-[#E7E5E0]" />
        </div>
        <div className="px-4 md:px-2 lg:px-4 pb-4">
          <button
            onClick={handleLogout}
            title={!isMobile ? "Log out" : undefined}
            className={cn(
              "group flex w-full items-center py-3 font-medium rounded-[12px] text-[#667085] hover:bg-red-50 hover:text-red-600 transition-colors",
              isMobile ? "px-4 text-sm" : "md:justify-center lg:justify-start px-4 md:px-0 lg:px-4 text-[15px]"
            )}
          >
            <LogOut className={cn("flex-shrink-0 h-[22px] w-[22px] text-[#667085] group-hover:text-red-500 transition-colors", isMobile ? "mr-3" : "md:mr-0 lg:mr-3")} strokeWidth={2} aria-hidden="true" />
            <span className={cn(isMobile ? "block" : "hidden lg:block")}>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header / Hamburger */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-[#E7E5E0] bg-white sticky top-0 z-20">
        <span className="font-semibold text-lg text-[#0B1020]">Organizer</span>
        <div className="flex items-center gap-2">
          <NotificationDropdown />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label="Toggle Menu"
            className="text-[#667085]"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 flex">
          <div 
            className="fixed inset-0 bg-[#0B1020]/40 backdrop-blur-sm" 
            onClick={() => setIsMobileOpen(false)} 
          />
          <div className="relative flex w-full max-w-[260px] flex-col bg-white pt-5 pb-4 shadow-xl z-40 border-r border-[#E7E5E0]">
            <div className="absolute right-0 top-0 -mr-12 pt-2">
              <Button
                variant="ghost"
                size="icon"
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-6 w-6 text-white" aria-hidden="true" />
              </Button>
            </div>
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* Desktop/Tablet Sidebar */}
      <div className="hidden md:flex md:flex-col md:w-20 lg:w-[260px] md:border-r border-[#E7E5E0] bg-white md:min-h-screen fixed top-0 left-0 md:pt-8 md:pb-4 transition-all duration-300 z-10">
        {renderSidebarContent(false)}
      </div>
    </>
  );
}
