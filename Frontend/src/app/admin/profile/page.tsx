"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/auth.service";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function AdminProfilePage() {
  const { user, updateUser } = useAuth();
  
  // Profile Update State
  const [name, setName] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{type: "success"|"error", text: string} | null>(null);

  // Password Change State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{type: "success"|"error", text: string} | null>(null);

  useEffect(() => {
    if (user?.name) {
      Promise.resolve().then(() => setName(user.name));
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsUpdatingProfile(true);
      setProfileMessage(null);
      await updateUser({ name });
      setProfileMessage({ type: "success", text: "Profile updated successfully." });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string; name?: string[] } } };
      setProfileMessage({ 
        type: "error", 
        text: error?.response?.data?.detail || error?.response?.data?.name?.[0] || "Failed to update profile." 
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    
    try {
      setIsChangingPassword(true);
      setPasswordMessage(null);
      await authService.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      setPasswordMessage({ type: "success", text: "Password changed successfully." });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string; old_password?: string[]; new_password?: string[]; non_field_errors?: string[] } } };
      const errorMsg = error?.response?.data?.detail 
        || error?.response?.data?.old_password?.[0] 
        || error?.response?.data?.new_password?.[0] 
        || error?.response?.data?.non_field_errors?.[0]
        || "Failed to change password.";
      setPasswordMessage({ type: "error", text: errorMsg });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <AdminTopBar 
        title="Admin Profile" 
        description="Manage your administrator account settings and security."
      />

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3">
          <Card className="border shadow-sm bg-white">
            <CardHeader className="pb-4 border-b flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-bold">{user?.name || "Administrator"}</h3>
              <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
              <div className="mt-4 px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-semibold">
                ADMIN
              </div>
            </CardHeader>
          </Card>
        </div>

        <div className="md:w-2/3 space-y-6">
          {/* Profile Details (GET/PUT /api/accounts/me/) */}
          <Card className="border shadow-sm bg-white">
            <CardHeader className="pb-4 border-b">
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your display name. Email and role are restricted for administrators.
              </CardDescription>
            </CardHeader>
            <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name <span className="text-destructive">*</span></Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  value={user?.email || ""} 
                  disabled 
                  className="bg-muted/50" 
                />
                <p className="text-[10px] text-muted-foreground">Email address cannot be changed.</p>
              </div>
            </div>
            
            <div className="space-y-2 hidden">
              <Label>Account Role</Label>
              <Input 
                value={user?.role || "ADMIN"} 
                disabled 
                className="bg-muted/50 md:w-[calc(50%-0.5rem)]" 
              />
            </div>

            {profileMessage && (
              <div className={`p-3 rounded-md text-sm ${profileMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50" : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50"}`}>
                {profileMessage.text}
              </div>
            )}

            <Button type="submit" disabled={isUpdatingProfile || !name.trim()}>
              {isUpdatingProfile ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change (POST /api/accounts/change-password/) */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password to maintain security.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2 md:w-[calc(50%-0.5rem)]">
              <Label htmlFor="oldPassword">Current Password <span className="text-destructive">*</span></Label>
              <Input 
                id="oldPassword" 
                type="password" 
                value={oldPassword} 
                onChange={(e) => setOldPassword(e.target.value)} 
                required 
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password <span className="text-destructive">*</span></Label>
                <Input 
                  id="newPassword" 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password <span className="text-destructive">*</span></Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                  minLength={8}
                />
              </div>
            </div>

            {passwordMessage && (
              <div className={`p-3 rounded-md text-sm ${passwordMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-900/50" : "bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50"}`}>
                {passwordMessage.text}
              </div>
            )}

            <Button type="submit" variant="outline" disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <span>Update Password</span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  </div>
  );
}
