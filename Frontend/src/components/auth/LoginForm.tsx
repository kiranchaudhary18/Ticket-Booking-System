"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";

import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  // Preserve the intended destination (e.g., booking flow) if provided
  const redirectTo = searchParams.get("redirect");
  
  // Only allow redirects to internal paths (prevents open redirect vulnerabilities)
  const isSafeRedirect = (path: string | null): path is string => {
    if (!path) return false;
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
  };
  
  const safeRedirect = isSafeRedirect(redirectTo) ? redirectTo : null;
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setServerError(null);
      const user = await login(data);
      toast.success("Successfully logged in!");
      
      // If a safe redirect was provided and the user is a CUSTOMER, return them
      // to the intended destination (e.g., the booking flow).
      // ADMIN/ORGANIZER are always sent to their dashboards — the customer
      // booking flow is not available to them.
      if (safeRedirect && user.role === UserRole.CUSTOMER) {
        router.push(safeRedirect);
        return;
      }
      
      // Role-based redirection
      if (user.role === UserRole.ADMIN) {
        router.push("/admin/dashboard");
      } else if (user.role === UserRole.ORGANIZER) {
        router.push("/organizer/dashboard");
      } else {
        router.push("/customer/dashboard");
      }
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        setServerError("Invalid email or password.");
        toast.error("Invalid credentials.");
      } else {
        setServerError("An unexpected error occurred. Please try again later.");
        toast.error("Network or server error occurred.");
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-7">
      <div className="space-y-1.5 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#c29665]">
          WELCOME BACK
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0A1526]">Welcome back</h1>
        <p className="text-sm text-slate-500">Enter your credentials to access your account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <div className="p-3 text-sm font-medium bg-destructive/15 text-destructive rounded-md">
            {serverError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              className={`pl-10 h-11 ${errors.email ? "border-destructive focus-visible:ring-destructive/50" : "border-slate-200"}`}
            />
          </div>
          {errors.email && (
            <p className="text-sm font-medium text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#3B41C5] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("password")}
              className={`h-11 ${errors.password ? "border-destructive focus-visible:ring-destructive/50 pr-10" : "border-slate-200 pr-10"}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm font-medium text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full h-11 bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white font-semibold rounded-full flex items-center justify-center transition-colors" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-slate-500">Don&apos;t have an account? </span>
        <Link href="/register" className="font-semibold text-[#3B41C5] hover:underline">
          Sign up
        </Link>
      </div>

      {/* Development Quick Login Helpers */}
      <div className="pt-6 mt-6 border-t border-slate-200">
        <p className="text-[10px] text-center text-slate-400 mb-3 font-bold uppercase tracking-widest">
          Quick Login (Dev Only)
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => {
              setValue("email", "admin@ticketbooking.com");
              setValue("password", "admin123");
            }}
          >
            Admin
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => {
              setValue("email", "kiran.chaudhary.cg@gmail.com");
              setValue("password", "password123");
            }}
          >
            Customer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs h-8 rounded-full border-slate-200 text-slate-600 hover:bg-slate-50"
            onClick={() => {
              setValue("email", "harsh@gmail.com");
              setValue("password", "password123");
            }}
          >
            Organizer
          </Button>
        </div>
      </div>
    </div>
  );
}
