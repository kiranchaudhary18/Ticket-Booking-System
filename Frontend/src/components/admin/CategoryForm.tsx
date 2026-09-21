"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminService } from "@/services/admin.service";
import { Category } from "@/types/event";

const categorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  is_active: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialData?: Category;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CategoryForm({ initialData, onSuccess, onCancel }: CategoryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || undefined,
      is_active: initialData ? initialData.is_active : true,
    },
  });

  const isActive = watch("is_active");

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      setIsSubmitting(true);
      setApiError(null);

      if (initialData) {
        await adminService.updateCategory(initialData.id, data);
        toast.success("Category updated successfully");
      } else {
        await adminService.createCategory(data);
        toast.success("Category created successfully");
      }
      onSuccess();
    } catch (err: unknown) {
      console.error("Category form error:", err);
      // Handle Django REST framework field validation errors
      const axiosErr = err as { response?: { data?: Record<string, string | string[]> }, message?: string };
      if (axiosErr.response?.data && typeof axiosErr.response.data === "object") {
        const errorData = axiosErr.response.data;
        if (errorData.name) {
          setApiError(Array.isArray(errorData.name) ? errorData.name[0] : errorData.name);
        } else {
          setApiError(axiosErr.message || "An error occurred while saving the category.");
        }
      } else {
        setApiError(axiosErr.message || "Failed to save category. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
      {apiError && (
        <div className="p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
          {apiError}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
        <Input
          id="name"
          placeholder="e.g., Music Festival"
          {...register("name")}
          disabled={isSubmitting}
          className={errors.name ? "border-destructive focus-visible:ring-destructive/50" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive font-medium">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Brief description of the category..."
          className={`resize-none ${errors.description ? "border-destructive focus-visible:ring-destructive/50" : ""}`}
          rows={3}
          {...register("description")}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="text-sm text-destructive font-medium">{errors.description.message}</p>
        )}
      </div>

      {initialData && (
        <div className="space-y-3 pt-2">
          <Label>Visibility</Label>
          <div className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="is_active" className="text-sm font-medium">Active Category</Label>
              <p className="text-[0.8rem] text-muted-foreground">
                Inactive categories cannot be selected for new events.
              </p>
            </div>
            <Select 
              value={isActive ? "true" : "false"} 
              onValueChange={(val) => setValue("is_active", val === "true", { shouldDirty: true })}
              disabled={isSubmitting}
            >
              <SelectTrigger id="is_active" className="w-[120px]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : initialData ? (
            <Save className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {isSubmitting ? "Saving..." : initialData ? "Save Changes" : "Create Category"}
        </Button>
      </div>
    </form>
  );
}
