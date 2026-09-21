"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { 
  Users, 
  Search, 
  Filter, 
  ShieldAlert,
  UserCog,
  CheckCircle2,
  XCircle
} from "lucide-react";
import Link from "next/link";

import { adminService } from "@/services/admin.service";
import { AdminUser, AdminUserListResponse, AdminUserFilters } from "@/types/admin";
import { UserRole } from "@/types/auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, ColumnDef } from "@/components/admin/DataTable";

export default function AdminUsersPage() {
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filters
  const [filters, setFilters] = useState<AdminUserFilters>({
    page: 1,
    search: "",
    role: "",
    is_active: undefined,
  });

  const fetchUsers = useCallback(async (currentFilters: AdminUserFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminService.getUsers(currentFilters);
      setData(response);
    } catch (err: unknown) {
      console.error("Failed to fetch users", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load users. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers(filters);
  }, [filters, fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchQuery, page: 1 }));
  };

  const handleFilterChange = (key: keyof AdminUserFilters, value: string | boolean | undefined) => {
    setFilters(prev => ({ 
      ...prev, 
      [key]: value === "all" ? undefined : value, 
      page: 1 
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && data && newPage <= Math.ceil(data.count / 10)) {
      setFilters(prev => ({ ...prev, page: newPage }));
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400">Admin</Badge>;
      case UserRole.ORGANIZER:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400">Organizer</Badge>;
      case UserRole.CUSTOMER:
        return <Badge variant="outline" className="text-muted-foreground">Customer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const columns: ColumnDef<AdminUser>[] = [
    {
      header: "Name",
      cell: (user) => (
        <Link href={`/admin/users/${user.id}`} className="hover:underline font-medium text-primary">
          {user.name}
        </Link>
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
      className: "text-muted-foreground",
    },
    {
      header: "Role",
      cell: (user) => getRoleBadge(user.role),
    },
    {
      header: "Status",
      headerClassName: "text-center",
      className: "text-center",
      cell: (user) => (
        user.is_active ? (
          <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 w-20 justify-center">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
          </Badge>
        ) : (
          <Badge variant="outline" className="text-red-500 border-red-200 dark:border-red-900 w-20 justify-center">
            <XCircle className="w-3 h-3 mr-1" /> Inactive
          </Badge>
        )
      ),
    },
    {
      header: "Created Date",
      className: "text-muted-foreground",
      cell: (user) => format(new Date(user.date_joined), "MMM d, yyyy"),
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <AdminTopBar 
        title="User Management" 
        description="View and manage platform users, roles, and account statuses."
      />

      <Card className="border shadow-sm bg-white">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Users List
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 md:w-auto w-full">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by name or email..."
                  className="pl-8 bg-muted/50 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </form>

              {/* Filters */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={filters.role || "all"}
                  onValueChange={(value: string | null) => handleFilterChange("role", value || undefined)}
                >
                  <SelectTrigger className="w-full sm:w-[130px] bg-muted/50">
                    <Filter className="w-3 h-3 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value={UserRole.CUSTOMER}>Customers</SelectItem>
                    <SelectItem value={UserRole.ORGANIZER}>Organizers</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admins</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.is_active?.toString() || "all"}
                  onValueChange={(value) => {
                    const boolValue = value === "true" ? true : value === "false" ? false : undefined;
                    handleFilterChange("is_active", boolValue === undefined ? "all" : boolValue);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[130px] bg-muted/50">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.ordering || "-date_joined"}
                  onValueChange={(value: string | null) => handleFilterChange("ordering", value || undefined)}
                >
                  <SelectTrigger className="w-full sm:w-[140px] bg-muted/50">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-date_joined">Newest First</SelectItem>
                    <SelectItem value="date_joined">Oldest First</SelectItem>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="-name">Name (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-dashed border-2 rounded-lg bg-destructive/5 border-destructive/20">
              <ShieldAlert className="h-10 w-10 text-destructive mb-4" />
              <h3 className="text-lg font-medium text-destructive">Failed to Load Users</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => fetchUsers(filters)}
              >
                Try Again
              </Button>
            </div>
          ) : (!data || data.results.length === 0) && !isLoading ? (
            <EmptyState 
              title="No Users Found" 
              message={
                filters.search || filters.role || filters.is_active !== undefined
                  ? "Try adjusting your search or filters."
                  : "No users have registered on the platform yet."
              }
              icon={<Users className="w-12 h-12 text-muted-foreground" />}
              actionLabel={
                (filters.search || filters.role || filters.is_active !== undefined) 
                  ? "Clear Filters"
                  : undefined
              }
              onAction={
                (filters.search || filters.role || filters.is_active !== undefined)
                  ? () => { setSearchQuery(""); setFilters({ page: 1 }); }
                  : undefined
              }
            />
          ) : (
            <DataTable 
              columns={columns}
              data={data?.results || []}
              keyExtractor={(user) => user.id}
              pagination={{
                currentPage: filters.page || 1,
                totalCount: data?.count || 0,
                pageSize: 10,
                hasNext: !!data?.next,
                hasPrevious: !!data?.previous,
                onPageChange: handlePageChange
              }}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
