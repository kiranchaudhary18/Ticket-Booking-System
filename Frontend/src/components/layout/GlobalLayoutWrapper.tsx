"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { UserRole } from "@/types/auth";
import { Navbar } from "@/components/common/Navbar";
import { Footer } from "@/components/common/Footer";
import { CustomerSidebar } from "@/components/layout/CustomerSidebar";
import { OrganizerSidebar } from "@/components/layout/OrganizerSidebar";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { NotificationProvider } from "@/contexts/NotificationContext";

import { OrganizerProfileProvider } from "@/contexts/OrganizerProfileContext";

export function GlobalLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const pathname = usePathname();

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 w-full flex flex-col">{children}</main>
        <Footer />
      </>
    );
  }

  if (!isAuthenticated || isAuthPage) {
    return (
      <>
        <Navbar />
        <main className="flex-1 w-full flex flex-col">{children}</main>
        <Footer />
      </>
    );
  }

  let Sidebar = null;
  let maxWidth: "7xl" | "1400px" = "7xl";

  if (user?.role === UserRole.CUSTOMER) {
    Sidebar = <CustomerSidebar />;
  } else if (user?.role === UserRole.ORGANIZER) {
    Sidebar = <OrganizerSidebar />;
  } else if (user?.role === UserRole.ADMIN) {
    Sidebar = <AdminSidebar />;
    maxWidth = "1400px";
  }

  if (Sidebar) {
    const layout = (
      <DashboardLayout sidebar={Sidebar} maxWidth={maxWidth}>
        {children}
      </DashboardLayout>
    );

    if (user?.role === UserRole.ORGANIZER) {
      return (
        <NotificationProvider>
          <OrganizerProfileProvider>
            {layout}
          </OrganizerProfileProvider>
        </NotificationProvider>
      );
    } else if (user?.role === UserRole.CUSTOMER) {
      return (
        <ProfileProvider>
          <NotificationProvider>
            {layout}
          </NotificationProvider>
        </ProfileProvider>
      );
    } else {
      // Admin
      return (
        <NotificationProvider>
          {layout}
        </NotificationProvider>
      );
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 w-full flex flex-col">{children}</main>
      <Footer />
    </>
  );
}
