"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Tag, 
  Plus, 
  Pencil, 
  Trash2, 
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Search,
  Tags
} from "lucide-react";

import { adminService } from "@/services/admin.service";
import { Category } from "@/types/event";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CategoryForm } from "@/components/admin/CategoryForm";
import { AdminLoadingState } from "@/components/admin/AdminLoadingState";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { DataTable, ColumnDef } from "@/components/admin/DataTable";
import { AdminTopBar } from "@/components/admin/AdminTopBar";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Selected category for edit/delete
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Form states (only for delete now)
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Backend returns a paginated list for categories? Wait, if it's ListAPIView it might return { results: [] }
      // Let's check what the API actually returns. Let's assume it returns an array or paginated object.
      const response = await adminService.getCategories();
      
      // If it's a paginated response, it has 'results'. If it's direct array, handle that.
      if (response && response.results) {
        setCategories(response.results);
      } else if (Array.isArray(response)) {
        setCategories(response);
      } else {
        setCategories([]);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch categories", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load categories.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCategories();
  }, [fetchCategories]);

  // Handle Deletion
  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      setIsSubmitting(true);
      await adminService.deleteCategory(selectedCategory.id);
      toast.success("Category deleted successfully");
      setIsDeleteOpen(false);
      fetchCategories();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete category";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setIsCreateOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsEditOpen(true);
  };

  const openDeleteDialog = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteOpen(true);
  };

  const columns: ColumnDef<Category>[] = [
    {
      header: "ID",
      accessorKey: "id",
      className: "font-medium text-muted-foreground",
      cell: (category) => `#${category.id}`
    },
    {
      header: "Name",
      accessorKey: "name",
      className: "font-medium",
    },
    {
      header: "Description",
      className: "text-muted-foreground max-w-xs truncate",
      cell: (category) => category.description || "-",
    },
    {
      header: "Status",
      headerClassName: "text-center",
      className: "text-center",
      cell: (category) => (
        category.is_active ? (
          <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 w-20 justify-center">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground w-20 justify-center">
            <XCircle className="w-3 h-3 mr-1" /> Inactive
          </Badge>
        )
      ),
    },
    {
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right space-x-2",
      cell: (category) => (
        <>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => openEditDialog(category)}
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            aria-label="Edit category"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => openDeleteDialog(category)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Delete category"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      ),
    }
  ];

  return (
    <div className="space-y-6 pb-10">
      <AdminTopBar 
        title="Categories" 
        description="Manage event categories available for organizers."
        action={
          <Button onClick={openCreateDialog} className="bg-[#5B5CE2] hover:bg-[#4a4bbf]">
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        }
      />

      <Card className="border shadow-sm flex-1 bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-lg">All Categories</CardTitle>
              <CardDescription>
                Active categories are visible to organizers during event creation.
              </CardDescription>
            </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search categories..."
                  className="pl-8 bg-muted/50 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 rounded-lg bg-destructive/5 border-destructive/20">
              <ShieldAlert className="h-10 w-10 text-destructive mb-4" />
              <h3 className="text-lg font-medium text-destructive">Failed to Load Categories</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
              <Button variant="outline" className="mt-4" onClick={fetchCategories}>
                Try Again
              </Button>
            </div>
          ) : categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || "").toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && !isLoading ? (
            <AdminEmptyState
              icon={Tags}
              title="No Categories Found"
              description={searchQuery ? "No categories match your search." : "No event categories have been created yet."}
              action={
                searchQuery
                  ? { label: "Clear Search", onClick: () => setSearchQuery("") }
                  : { label: "Add Category", onClick: openCreateDialog }
              }
            />
          ) : (
            <DataTable
              columns={columns}
              data={categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.description || "").toLowerCase().includes(searchQuery.toLowerCase()))}
              keyExtractor={(category) => category.id}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new event category. It will be available for organizers immediately.
            </DialogDescription>
          </DialogHeader>
          <CategoryForm 
            onSuccess={() => {
              setIsCreateOpen(false);
              fetchCategories();
            }}
            onCancel={() => setIsCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category details or change visibility.
            </DialogDescription>
          </DialogHeader>
          {selectedCategory && (
            <CategoryForm 
              initialData={selectedCategory}
              onSuccess={() => {
                setIsEditOpen(false);
                fetchCategories();
              }}
              onCancel={() => setIsEditOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category <strong>{selectedCategory?.name}</strong>? 
              This action might be permanent depending on the backend constraints. It is often recommended to mark the category as <strong>Inactive</strong> instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
