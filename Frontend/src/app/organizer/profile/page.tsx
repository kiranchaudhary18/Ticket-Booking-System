"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Camera, Loader2, Save, User as UserIcon, Building } from "lucide-react";
import Image from "next/image";

import { useOrganizerProfile } from "@/contexts/OrganizerProfileContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PageSkeleton } from "@/components/common/PageSkeleton";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string()
    .regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number (10-15 digits with optional +)")
    .min(1, "Phone number is required"),
  organization_name: z.string().min(1, "Organization name is required"),
  organization_description: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  pincode: z.string()
    .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit Indian pincode")
    .optional()
    .or(z.literal("")),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  bank_account_number: z.string().regex(/^[0-9]{9,18}$/, "Enter a valid bank account number").optional().or(z.literal("")),
  bank_ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code (e.g. HDFC0000001)").optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function OrganizerProfilePage() {
  const { user } = useAuth();
  const { profile, isLoading, refreshProfile, updateProfile, updateBasicProfile } = useOrganizerProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { register, handleSubmit, formState: { errors, isDirty }, reset } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      organization_name: "",
      organization_description: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      website: "",
      bank_account_number: "",
      bank_ifsc: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || "",
        phone: profile.phone || "",
        organization_name: profile.organization_name || "",
        organization_description: profile.organization_description || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
        website: profile.website || "",
        bank_account_number: profile.bank_account_number || "",
        bank_ifsc: profile.bank_ifsc || "",
      });

      if (profile.profile_picture) {
        setPreviewImage(
          profile.profile_picture.startsWith("http")
            ? profile.profile_picture
            : `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${profile.profile_picture}`
        );
      } else {
        setPreviewImage(null);
      }
    }
  }, [profile, reset]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Profile picture must be 5MB or less.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedImage(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewImage(objectUrl);
      
      return () => URL.revokeObjectURL(objectUrl);
    }
  };

  const handleCancel = () => {
    reset({
      name: profile?.name || "",
      phone: profile?.phone || "",
      organization_name: profile?.organization_name || "",
      organization_description: profile?.organization_description || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      pincode: profile?.pincode || "",
      website: profile?.website || "",
    });
    
    setSelectedImage(null);
    if (profile?.profile_picture) {
      setPreviewImage(
        profile.profile_picture.startsWith("http")
          ? profile.profile_picture
          : `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${profile.profile_picture}`
      );
    } else {
      setPreviewImage(null);
    }
    
    setIsEditing(false);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setIsSaving(true);
      
      if (!profile || values.name !== profile.name) {
        await updateBasicProfile(values.name);
      }

      if (selectedImage) {
        const formData = new FormData();
        
        formData.append("phone", values.phone);
        formData.append("organization_name", values.organization_name);
        if (values.organization_description) formData.append("organization_description", values.organization_description);
        if (values.address) formData.append("address", values.address);
        if (values.city) formData.append("city", values.city);
        if (values.state) formData.append("state", values.state);
        if (values.pincode) formData.append("pincode", values.pincode);
        if (values.website) formData.append("website", values.website);
        if (values.bank_account_number) formData.append("bank_account_number", values.bank_account_number);
        if (values.bank_ifsc) formData.append("bank_ifsc", values.bank_ifsc);
        
        formData.append("profile_picture_upload", selectedImage);
        
        await updateProfile(formData as any);
      } else {
        const updateData: any = {
          phone: values.phone,
          organization_name: values.organization_name,
        };
        
        if (values.organization_description) updateData.organization_description = values.organization_description;
        if (values.address) updateData.address = values.address;
        if (values.city) updateData.city = values.city;
        if (values.state) updateData.state = values.state;
        if (values.pincode) updateData.pincode = values.pincode;
        if (values.website) updateData.website = values.website;
        if (values.bank_account_number) updateData.bank_account_number = values.bank_account_number;
        if (values.bank_ifsc) updateData.bank_ifsc = values.bank_ifsc;
        
        await updateProfile(updateData);
      }

      await refreshProfile();
      setSelectedImage(null);
      setIsEditing(false);
      
    } catch (err: unknown) {
      console.error("Failed to update profile", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organizer Profile</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information and organization details.
          </p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        {/* Top Section: Picture and Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Picture Card */}
          <Card className="md:col-span-1 border-dashed shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <div 
                className={`relative group ${isEditing ? 'cursor-pointer' : ''} mb-6`} 
                onClick={() => isEditing && fileInputRef.current?.click()}
              >
                <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-background shadow-md flex items-center justify-center relative z-10">
                  {previewImage ? (
                    <Image 
                      src={previewImage} 
                      alt={`Profile picture for ${profile?.name || "Organizer"}`} 
                      fill 
                      className="object-cover"
                      sizes="128px"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/10 flex items-center justify-center text-3xl font-bold text-accent uppercase">
                      {(profile?.name || "O").charAt(0)}
                    </div>
                  )}
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  )}
                </div>
              </div>
              
              <h3 className="font-semibold text-lg text-center mb-1">{profile?.name}</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">{profile?.email}</p>
              
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={!isEditing}
              />
              
              {isEditing && (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Picture
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    JPG, PNG or WebP. Max 5MB.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Basic Info Card */}
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Your core identity details on the platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
                <Input id="name" placeholder="Jane Doe" disabled={!isEditing} {...register("name")} className={errors.name ? "border-destructive focus-visible:ring-destructive/50" : ""} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={profile?.email || ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Account Role</Label>
                  <Input value={profile?.role || ""} disabled className="bg-muted uppercase" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Extended Info Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Organization Details
            </CardTitle>
            <CardDescription>
              Information about your organization.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="organization_name">Organization Name <span className="text-destructive">*</span></Label>
                <Input id="organization_name" placeholder="Acme Events" disabled={!isEditing} {...register("organization_name")} className={errors.organization_name ? "border-destructive focus-visible:ring-destructive/50" : ""} />
                {errors.organization_name && <p className="text-sm text-destructive">{errors.organization_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
                <Input id="phone" placeholder="+919876543210" disabled={!isEditing} {...register("phone")} className={errors.phone ? "border-destructive focus-visible:ring-destructive/50" : ""} />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization_description">Organization Description</Label>
              <textarea 
                id="organization_description" 
                placeholder="We organize the best events in town..."
                disabled={!isEditing} 
                {...register("organization_description")}
                rows={3}
                className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${errors.organization_description ? "border-destructive focus-visible:ring-destructive/50" : ""}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://www.acmeevents.com" disabled={!isEditing} {...register("website")} className={errors.website ? "border-destructive focus-visible:ring-destructive/50" : ""} />
              {errors.website && <p className="text-sm text-destructive">{errors.website.message}</p>}
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium text-sm text-foreground">Address Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" placeholder="123 Main St, Apt 4B" disabled={!isEditing} {...register("address")} className={errors.address ? "border-destructive focus-visible:ring-destructive/50" : ""} />
                {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="Mumbai" disabled={!isEditing} {...register("city")} className={errors.city ? "border-destructive focus-visible:ring-destructive/50" : ""} />
                  {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="Maharashtra" disabled={!isEditing} {...register("state")} className={errors.state ? "border-destructive focus-visible:ring-destructive/50" : ""} />
                  {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" placeholder="400001" disabled={!isEditing} {...register("pincode")} className={errors.pincode ? "border-destructive focus-visible:ring-destructive/50" : ""} />
                  {errors.pincode && <p className="text-sm text-destructive">{errors.pincode.message}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Banking & Payouts</CardTitle>
            <CardDescription>
              Provide your bank details to receive automatic payouts via Razorpay Route.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Bank Account Number</Label>
                <Input 
                  id="bank_account_number" 
                  placeholder="e.g. 1122334455" 
                  disabled={!isEditing || !!profile?.razorpay_linked_account_id} 
                  {...register("bank_account_number")} 
                  className={errors.bank_account_number ? "border-destructive focus-visible:ring-destructive/50" : ""} 
                  type="password"
                />
                {errors.bank_account_number && <p className="text-sm text-destructive">{errors.bank_account_number.message}</p>}
                {profile?.razorpay_linked_account_id && (
                   <p className="text-xs text-muted-foreground mt-1">Bank account is already linked.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_ifsc">IFSC Code</Label>
                <Input 
                  id="bank_ifsc" 
                  placeholder="e.g. HDFC0000001" 
                  disabled={!isEditing || !!profile?.razorpay_linked_account_id} 
                  {...register("bank_ifsc")} 
                  className={errors.bank_ifsc ? "border-destructive focus-visible:ring-destructive/50" : ""} 
                />
                {errors.bank_ifsc && <p className="text-sm text-destructive">{errors.bank_ifsc.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <div className="flex justify-end gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || (!isDirty && !selectedImage)}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        )}
        
      </form>
    </div>
  );
}
