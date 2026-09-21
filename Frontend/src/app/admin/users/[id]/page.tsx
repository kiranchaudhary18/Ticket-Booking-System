"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Loader2, 
  User as UserIcon,
  Mail,
  CalendarDays,
  Activity,
  CheckCircle2,
  XCircle,
  Save
} from "lucide-react";

import { adminService } from "@/services/admin.service";
import { AdminUser } from "@/types/admin";
import { UserRole } from "@/types/auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function AdminUserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Number(params.id);
  
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [role, setRole] = useState<string>("");
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await adminService.getUserDetail(userId);
        setUser(data);
        setName(data.name);
        setRole(data.role);
        setIsActive(data.is_active);
      } catch (err: unknown) {
        console.error("Failed to fetch user details", err);
        const axiosErr = err as { message?: string };
        setError(axiosErr?.message || "Failed to load user information.");
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  const handleSaveClick = () => {
    if (!user) return;
    
    // Check if we are doing a sensitive change (role change or deactivating)
    if (user.role !== role || (user.is_active && !isActive)) {
      setShowConfirmDialog(true);
    } else {
      // Just name change or activating an inactive account (less destructive)
      handleSave();
    }
  };

  const handleSave = async () => {
    try {
      setShowConfirmDialog(false);
      setIsSaving(true);
      const updatedData = await adminService.updateUser(userId, {
        name,
        role,
        is_active: isActive
      });
      setUser(updatedData);
      toast.success("User updated successfully");
    } catch (err: unknown) {
      console.error("Failed to update user", err);
      const axiosErr = err as { message?: string };
      toast.error(axiosErr?.message || "Failed to update user. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (roleStr: string) => {
    switch (roleStr) {
      case UserRole.ADMIN:
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400">Admin</Badge>;
      case UserRole.ORGANIZER:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Organizer</Badge>;
      case UserRole.CUSTOMER:
        return <Badge variant="outline" className="text-muted-foreground">Customer</Badge>;
      default:
        return <Badge variant="outline">{roleStr}</Badge>;
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="User Not Found"
          message={error || "The user you are looking for does not exist or you don't have permission to view them."}
          actionLabel="Back to Users List"
          onAction={() => router.push("/admin/users")}
        />
      </div>
    );
  }

  const hasChanges = user.name !== name || user.role !== role || user.is_active !== isActive;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-10">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => router.push("/admin/users")}
          className="h-9 w-9"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage account details and permissions for {user.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Basic Info Overview */}
        <Card className="md:col-span-1 shadow-sm border h-fit">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-sm">
                <span className="text-3xl font-bold text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-lg">{user.name}</h3>
                <p className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </p>
              </div>
              <div className="flex gap-2">
                {getRoleBadge(user.role)}
                {user.is_active ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-red-500 border-red-200 dark:border-red-900">
                    <XCircle className="w-3 h-3 mr-1" /> Inactive
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Date Joined
                </span>
                <span className="text-sm font-medium">
                  {format(new Date(user.date_joined), "MMMM d, yyyy")}
                </span>
              </div>
              
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium uppercase flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" />
                  Last Login
                </span>
                <span className="text-sm font-medium">
                  {user.last_login 
                    ? format(new Date(user.last_login), "MMM d, yyyy 'at' h:mm a") 
                    : "Never logged in"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Edit Form */}
        <Card className="md:col-span-2 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" />
              Account Settings
            </CardTitle>
            <CardDescription>
              Update user details and permissions. Email is read-only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                value={user.email} 
                readOnly
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email address cannot be changed by administrators.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <Select value={role} onValueChange={(val) => setRole(val as string)}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.CUSTOMER}>Customer</SelectItem>
                    <SelectItem value={UserRole.ORGANIZER}>Organizer</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Administrator</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Determine platform permissions.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Account Status</Label>
                <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Active Account</Label>
                    <p className="text-[0.8rem] text-muted-foreground">
                      Allow this user to log in.
                    </p>
                  </div>
                  <Select value={isActive ? "true" : "false"} onValueChange={(val) => setIsActive(val === "true")}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t pt-4">
            <Button 
              onClick={handleSaveClick} 
              disabled={!hasChanges || isSaving || !name.trim()}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Confirmation Dialog for Destructive Actions */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Account Changes</AlertDialogTitle>
            <AlertDialogDescription>
              {user.is_active && !isActive && (
                <span className="block mb-2 text-destructive font-medium">
                  Warning: You are about to deactivate this account. The user will no longer be able to log in.
                </span>
              )}
              {user.role !== role && (
                <span className="block mb-2">
                  You are changing the user&apos;s role from <strong>{user.role}</strong> to <strong>{role}</strong>. This will modify their permissions on the platform.
                </span>
              )}
              Are you sure you want to proceed with these changes?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSave}
              className={user.is_active && !isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Confirm Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
