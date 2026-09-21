import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  maxWidth?: "md" | "xl";
}

export function AuthLayout({ children, maxWidth = "md" }: AuthLayoutProps) {
  const maxWidthClass = maxWidth === "xl" ? "max-w-xl" : "max-w-md";
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 bg-[#FAF8F5]">
      <div className={`w-full ${maxWidthClass} bg-white border border-border/40 shadow-[0_2px_12px_rgb(0,0,0,0.04)] rounded-[1.25rem] p-8 sm:p-10`}>
        {children}
      </div>
    </div>
  );
}
