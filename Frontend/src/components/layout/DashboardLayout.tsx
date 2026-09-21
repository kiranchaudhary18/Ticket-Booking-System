import { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  maxWidth?: "7xl" | "1400px";
}

export function DashboardLayout({ children, sidebar, maxWidth = "7xl" }: DashboardLayoutProps) {
  const maxWidthClass = maxWidth === "1400px" ? "max-w-[1400px]" : "max-w-7xl";
  
  return (
    <div className="min-h-screen w-full bg-[#F8F7F4] flex flex-col md:flex-row">
      {/* Sidebar is rendered here. It should handle its own fixed positioning on desktop */}
      {sidebar}
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen w-full md:pl-64 transition-all duration-300">
        <div className={`mx-auto w-full ${maxWidthClass} px-4 sm:px-6 md:px-8 py-6 flex-1`}>
          {children}
        </div>
      </main>
    </div>
  );
}
