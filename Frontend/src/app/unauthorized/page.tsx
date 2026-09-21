"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, LogIn, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-in fade-in duration-500">
      <Card className="w-full max-w-md text-center border-amber-200/50 shadow-sm bg-amber-50/30 dark:bg-amber-950/20">
        <CardHeader>
          <div className="mx-auto bg-amber-100 dark:bg-amber-900/40 p-4 rounded-full w-20 h-20 flex items-center justify-center mb-4">
            <ShieldAlert className="h-10 w-10 text-amber-600 dark:text-amber-500" />
          </div>
          <CardTitle className="text-4xl font-black text-amber-600 dark:text-amber-500">401</CardTitle>
          <CardDescription className="text-lg mt-2 font-medium text-amber-700/80 dark:text-amber-400/80">Authentication Required</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You need to be logged in to access this page. Please sign in to continue.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-3 w-full">
          <Button asChild variant="default" className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 text-white">
            <Link href="/login">
              <LogIn className="mr-2 h-4 w-4" /> Login
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto border-amber-200 hover:bg-amber-100 dark:border-amber-900 dark:hover:bg-amber-900/50 hover:text-amber-900 dark:hover:text-amber-100">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Go Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
