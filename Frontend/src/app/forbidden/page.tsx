"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, LayoutDashboard, ShieldX, LogIn } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";

export default function ForbiddenPage() {
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
      <Card className="w-full max-w-md text-center border-destructive/20 shadow-sm bg-destructive/5 dark:bg-destructive/10">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
            <ShieldX className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-4xl font-black text-destructive">403</CardTitle>
          <CardDescription className="text-lg mt-2 font-medium">Access Denied</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You don&apos;t have permission to view this content or perform this action. Your account may not have the required privileges.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-3 w-full">
          {dashboardLink ? (
            <Button asChild variant="default" className="w-full sm:w-auto">
              <Link href={dashboardLink}>
                <LayoutDashboard className="mr-2 h-4 w-4" /> Go Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild variant="default" className="w-full sm:w-auto">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full sm:w-auto border-destructive/20 hover:bg-destructive/10 hover:text-destructive">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
