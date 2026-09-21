"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2, User, Mail, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/types/auth";

import { toast } from "sonner";

const registerSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long." }),
    confirm_password: z.string().min(1, { message: "Please confirm your password." }),
    role: z.enum([UserRole.CUSTOMER, UserRole.ORGANIZER], {
      message: "Please select a valid role.",
    }),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const { register: registerApi } = useAuth();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirm_password: "",
      role: UserRole.CUSTOMER,
    },
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setServerError(null);
      await registerApi(data);
      toast.success("Account created successfully! Please log in.");
      // Registration successful, redirect to login
      router.push("/login?registered=true");
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: Record<string, string | string[]> } };
      if (axiosErr.response?.data && typeof axiosErr.response.data === "object") {
        const errData = axiosErr.response.data;
        if (errData.email) {
          setServerError("A user with this email already exists.");
          toast.error("Email is already in use.");
        } else {
          const messages = Object.values(errData).flat().join(" ");
          setServerError(messages || "Registration failed. Please check your details.");
          toast.error("Registration failed. Please check your details.");
        }
      } else {
        setServerError("An unexpected network error occurred.");
        toast.error("Network or server error occurred.");
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-7">
      <div className="space-y-1.5 text-center">
        <span className="inline-block text-[11px] font-bold uppercase tracking-[0.2em] text-[#c29665]">
          GET STARTED
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#0A1526]">Create your account</h1>
        <p className="text-sm text-slate-500">Join us and discover amazing events around you</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <div className="p-3 text-sm font-medium bg-destructive/15 text-destructive rounded-md">
            {serverError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              id="name"
              placeholder="John Doe"
              {...register("name")}
              className={`pl-10 h-11 ${errors.name ? "border-destructive focus-visible:ring-destructive/50" : "border-slate-200"}`}
            />
          </div>
          {errors.name && (
            <p className="text-sm font-medium text-destructive">{errors.name.message}</p>
          )}
        </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
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
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm font-medium text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password" className="text-sm font-semibold text-slate-700">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("confirm_password")}
                className={`h-11 ${errors.confirm_password ? "border-destructive focus-visible:ring-destructive/50 pr-10" : "border-slate-200 pr-10"}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-sm font-medium text-destructive">{errors.confirm_password.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className="text-sm font-semibold text-slate-700">I want to...</Label>
          <Select 
            value={selectedRole} 
            onValueChange={(val) => { if (val) setValue("role", val as UserRole.ORGANIZER | UserRole.CUSTOMER, { shouldValidate: true }); }}
          >
            <SelectTrigger id="role" className={`h-11 ${errors.role ? "border-destructive focus-visible:ring-destructive/50" : "border-slate-200"}`}>
              <SelectValue placeholder="Select an account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UserRole.CUSTOMER}>Book tickets (Customer)</SelectItem>
              <SelectItem value={UserRole.ORGANIZER}>Host events (Organizer)</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm font-medium text-destructive">{errors.role.message}</p>
          )}
        </div>

        <Button 
          type="submit" 
          className="w-full h-11 mt-2 bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white font-semibold rounded-full flex items-center justify-center transition-colors" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-slate-500">Already have an account? </span>
        <Link href="/login" className="font-semibold text-[#3B41C5] hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
