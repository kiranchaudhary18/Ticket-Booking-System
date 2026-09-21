"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard, FileQuestion, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";

export default function NotFound() {
  const { user, isAuthenticated } = useAuth();
  
  const getDashboardLink = () => {
    if (!isAuthenticated || !user) return null;
    switch (user.role) {
      case UserRole.ADMIN: return "/admin/dashboard";
      case UserRole.ORGANIZER: return "/organizer/dashboard";
      case UserRole.CUSTOMER: default: return "/customer/dashboard";
    }
  };

  const dashboardLink = getDashboardLink();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md text-center border-dashed shadow-sm">
        <CardHeader>
          <div className="mx-auto bg-muted p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
            <FileQuestion className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-4xl font-black text-primary">404</CardTitle>
          <CardDescription className="text-lg mt-2 font-medium">Page Not Found</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist, has been moved, or is temporarily unavailable.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-3 w-full">
          <Button asChild variant="default" className="w-full sm:w-auto">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Link>
          </Button>
          {dashboardLink ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={dashboardLink}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Go Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
