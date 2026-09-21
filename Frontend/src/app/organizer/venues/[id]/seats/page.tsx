"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { organizerService } from "@/services/organizer.service";
import { Venue } from "@/types/event";
import { Seat } from "@/types/booking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, PlusCircle, LayoutGrid, Trash2 } from "lucide-react";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

const bulkCreateSchema = z.object({
  row: z.string().min(1, "Row identifier is required").max(5, "Row identifier is too long").toUpperCase(),
  start_seat_number: z.coerce.number().min(1, "Start seat must be at least 1"),
  end_seat_number: z.coerce.number().min(1, "End seat must be at least 1"),
  seat_type: z.enum(["REGULAR", "PREMIUM", "VIP"]),
  price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format (e.g. 1500.00)"),
}).refine(data => data.start_seat_number <= data.end_seat_number, {
  message: "End seat must be greater than or equal to start seat",
  path: ["end_seat_number"],
});

type BulkCreateFormValues = z.infer<typeof bulkCreateSchema>;

export default function VenueSeatsPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = Number(params.id);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isEditRowOpen, setIsEditRowOpen] = useState(false);
  const [editingSeats, setEditingSeats] = useState<Seat[]>([]);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSeats, setDeletingSeats] = useState<Seat[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(bulkCreateSchema),
    defaultValues: {
      row: "",
      start_seat_number: 1,
      end_seat_number: 10,
      seat_type: "REGULAR",
      price: "",
    }
  });

  const seatType = watch("seat_type");

  // Separate form for editing
  const editRowSchema = z.object({
    seat_type: z.enum(["REGULAR", "PREMIUM", "VIP"]),
    price: z.string().min(1, "Price is required").regex(/^\d+(\.\d{1,2})?$/, "Invalid price format (e.g. 1500.00)"),
  });
  
  type EditRowFormValues = z.infer<typeof editRowSchema>;
  
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    setValue: setEditValue,
    reset: resetEdit,
    watch: watchEdit,
    formState: { errors: editErrors }
  } = useForm({
    resolver: zodResolver(editRowSchema),
    defaultValues: {
      seat_type: "REGULAR" as "REGULAR" | "PREMIUM" | "VIP",
      price: "",
    }
  });
  const editSeatType = watchEdit("seat_type");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const allVenues = await organizerService.getVenues();
      const currentVenue = allVenues.find(v => v.id === venueId);
      
      if (!currentVenue) {
        setError("Venue not found.");
        setIsLoading(false);
        return;
      }
      
      if (currentVenue.organizer !== user?.id) {
        setError("You do not have permission to manage seats for this venue.");
        setIsLoading(false);
        return;
      }
      
      setVenue(currentVenue);
      
      const seatsData = await organizerService.getSeats(venueId);
      setSeats(seatsData);
      
    } catch (err: unknown) {
      console.error("Error loading venue seats:", err);
      setError("Failed to load seating information.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isNaN(venueId)) {
      fetchData();
    }
  }, [user, venueId]);

  const onBulkCreateSubmit = async (values: BulkCreateFormValues) => {
    try {
      setIsSubmitting(true);
      setApiError(null);
      
      // Calculate how many seats we are creating to check capacity
      const count = values.end_seat_number - values.start_seat_number + 1;
      if (venue?.capacity && (seats.length + count > venue.capacity)) {
        setApiError(`Adding ${count} seats exceeds venue capacity of ${venue.capacity}. Currently configured: ${seats.length}.`);
        setIsSubmitting(false);
        return;
      }
      
      const response = await organizerService.bulkCreateSeats({
        venue: venueId,
        row: values.row,
        start_seat_number: values.start_seat_number,
        end_seat_number: values.end_seat_number,
        seat_type: values.seat_type,
        price: values.price
      });
      
      toast({
        title: "Success",
        description: response.message || `Successfully created ${response.created_count || count} seats.`,
      });
      
      setIsBulkOpen(false);
      reset();
      fetchData(); // Refresh list
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> | { detail?: string } } };
      console.error("API Error during bulk create:", error);
      let errorMessage = "An unexpected error occurred.";
      
      if (error.response?.data) {
        const data = error.response.data as Record<string, unknown>;
        if (data.detail && typeof data.detail === 'string') {
          errorMessage = data.detail;
        } else if (typeof data === "object" && data !== null) {
          // Flatten standard DRF validation errors
          const apiErrors = Object.entries(data)
            .map(([field, msgs]) => {
              if (Array.isArray(msgs)) return msgs.join(" ");
              return `${field}: ${msgs}`;
            })
            .join(" | ");
          errorMessage = apiErrors || errorMessage;
        }
      }
      setApiError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onEditRowSubmit = async (values: EditRowFormValues) => {
    try {
      setIsSubmitting(true);
      setApiError(null);
      
      // Update all seats in this specific row group
      await Promise.all(
        editingSeats.map(seat => 
          organizerService.updateSeat(seat.id, {
            seat_type: values.seat_type,
            price: values.price
          })
        )
      );
      
      toast({
        title: "Success",
        description: `Successfully updated ${editingSeats.length} seats.`,
      });
      
      setIsEditRowOpen(false);
      fetchData();
    } catch (error: unknown) {
      console.error("API Error during edit:", error);
      setApiError("Failed to update some seats. They might be locked by bookings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditRow = (seatsToEdit: Seat[]) => {
    if (seatsToEdit.length === 0) return;
    setEditingSeats(seatsToEdit);
    resetEdit({
      seat_type: seatsToEdit[0].seat_type,
      price: parseFloat(seatsToEdit[0].price).toFixed(2),
    });
    setApiError(null);
    setIsEditRowOpen(true);
  };

  const confirmDeleteGroup = (seatsToDelete: Seat[]) => {
    if (seatsToDelete.length === 0) return;
    setDeletingSeats(seatsToDelete);
    setIsDeleteDialogOpen(true);
  };

  const executeDeleteGroup = async () => {
    try {
      setIsSubmitting(true);
      await Promise.all(deletingSeats.map(seat => organizerService.deleteSeat(seat.id)));
      toast({ title: "Success", description: `Successfully deleted ${deletingSeats.length} seats.` });
      setIsDeleteDialogOpen(false);
      setDeletingSeats([]);
      fetchData();
    } catch (error) {
      console.error("Error deleting seats:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete some seats. They might be linked to existing bookings." });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !venue) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Access Denied"
          message={error || "Could not load venue details."}
          actionLabel="Go Back"
          onAction={() => router.back()}
          type="403"
        />
      </div>
    );
  }

  // Calculate summary for display
  const rows = Array.from(new Set(seats.map(s => s.row))).sort();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Venue Seats</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2">
              {venue.name} • {venue.city}
              {venue.capacity && (
                <Badge variant="outline" className="h-5">
                  Capacity: {venue.capacity}
                </Badge>
              )}
            </p>
          </div>
        </div>
        
        <Button onClick={() => setIsBulkOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Bulk Create Seats
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Seating Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Total Seats Added</span>
                  <span className="font-semibold text-lg">{seats.length}</span>
                </div>
                
                {venue.capacity && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Remaining Capacity</span>
                    <span className={`font-semibold text-lg ${venue.capacity - seats.length <= 0 ? 'text-destructive' : ''}`}>
                      {Math.max(0, venue.capacity - seats.length)}
                    </span>
                  </div>
                )}
                
                <div className="pt-2">
                  <span className="text-sm font-medium mb-2 block">Seats by Type</span>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <Badge variant="outline" className="border-blue-500 text-blue-600">REGULAR</Badge>
                      <span>{seats.filter(s => s.seat_type === "REGULAR").length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <Badge variant="outline" className="border-purple-500 text-purple-600">PREMIUM</Badge>
                      <span>{seats.filter(s => s.seat_type === "PREMIUM").length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <Badge variant="outline" className="border-amber-500 text-amber-600">VIP</Badge>
                      <span>{seats.filter(s => s.seat_type === "VIP").length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column: Configured Seats Table */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configured Layout</CardTitle>
              <CardDescription>
                Overview of physical seats mapped to this venue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {seats.length === 0 ? (
                <EmptyState
                  icon={<LayoutGrid className="h-12 w-12 text-muted-foreground" />}
                  title="No seats configured"
                  message="Use the bulk creation tool to add rows of seats to your venue layout."
                  actionLabel="Add Seats"
                  onAction={() => setIsBulkOpen(true)}
                  className="min-h-[300px] border-none shadow-none bg-muted/5"
                />
              ) : (
                <div className="rounded-md border max-h-[600px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Seat Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map(row => {
                        const rowSeats = seats.filter(s => s.row === row);
                        const types = Array.from(new Set(rowSeats.map(s => s.seat_type)));
                        
                        return types.map(type => {
                          const specificSeats = rowSeats.filter(s => s.seat_type === type);
                          const count = specificSeats.length;
                          const price = specificSeats[0].price; // assuming same price for same row+type
                          
                          return (
                            <TableRow key={`${row}-${type}`}>
                              <TableCell className="font-medium">Row {row}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  type === "VIP" ? "border-amber-500 text-amber-600" :
                                  type === "PREMIUM" ? "border-purple-500 text-purple-600" :
                                  "border-blue-500 text-blue-600"
                                }>
                                  {type}
                                </Badge>
                              </TableCell>
                              <TableCell>${parseFloat(price).toFixed(2)}</TableCell>
                              <TableCell>{count} seats</TableCell>
                              <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditRow(specificSeats)} className="h-8 px-2 text-muted-foreground hover:text-primary">
                                  Edit Price/Type
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => confirmDeleteGroup(specificSeats)} className="h-8 px-2 text-muted-foreground hover:text-destructive" aria-label={`Delete row ${row} seats`}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bulk Create Dialog */}
      <Dialog open={isBulkOpen} onOpenChange={(open) => {
        setIsBulkOpen(open);
        if (!open) { setApiError(null); reset(); }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Create Seats</DialogTitle>
            <DialogDescription>
              Quickly generate a block of consecutive seats for a specific row.
            </DialogDescription>
          </DialogHeader>
          
          {apiError && (
            <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium border border-destructive/20">
              {apiError}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onBulkCreateSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="row">Row Identifier <span className="text-destructive">*</span></Label>
                <Input id="row" placeholder="e.g. A" {...register("row")} />
                {errors.row && <p className="text-xs text-destructive">{errors.row.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Base Price ($) <span className="text-destructive">*</span></Label>
                <Input id="price" type="number" step="0.01" placeholder="e.g. 1500.00" {...register("price")} />
                {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_seat_number">Start Seat Number <span className="text-destructive">*</span></Label>
                <Input id="start_seat_number" type="number" {...register("start_seat_number")} />
                {errors.start_seat_number && <p className="text-xs text-destructive">{errors.start_seat_number.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_seat_number">End Seat Number <span className="text-destructive">*</span></Label>
                <Input id="end_seat_number" type="number" {...register("end_seat_number")} />
                {errors.end_seat_number && <p className="text-xs text-destructive">{errors.end_seat_number.message}</p>}
              </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="seat_type">Seat Type</Label>
              <Select
                value={seatType}
                onValueChange={(val) => setValue("seat_type", val as "REGULAR" | "PREMIUM" | "VIP", { shouldValidate: true })}
              >
                <SelectTrigger id="seat_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR">REGULAR</SelectItem>
                  <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                </SelectContent>
              </Select>
              {errors.seat_type && <p className="text-xs text-destructive">{errors.seat_type.message}</p>}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => setIsBulkOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Seats
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Row Dialog */}
      <Dialog open={isEditRowOpen} onOpenChange={(open) => {
        setIsEditRowOpen(open);
        if (!open) { setApiError(null); resetEdit(); setEditingSeats([]); }
      }}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Seat Group</DialogTitle>
            <DialogDescription>
              {editingSeats.length > 0 && `Updating ${editingSeats.length} seats in Row ${editingSeats[0].row}.`}
            </DialogDescription>
          </DialogHeader>
          
          {apiError && (
            <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium border border-destructive/20">
              {apiError}
            </div>
          )}
          
          <form onSubmit={handleEditSubmit(onEditRowSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit_seat_type">Seat Type</Label>
              <Select
                value={editSeatType as string}
                onValueChange={(val) => setEditValue("seat_type", val as "REGULAR" | "PREMIUM" | "VIP", { shouldValidate: true })}
              >
                <SelectTrigger id="edit_seat_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR">REGULAR</SelectItem>
                  <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                </SelectContent>
              </Select>
              {editErrors.seat_type && <p className="text-xs text-destructive">{editErrors.seat_type.message as string}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_price">Price ($) <span className="text-destructive">*</span></Label>
              <Input id="edit_price" type="number" step="0.01" {...registerEdit("price")} />
              {editErrors.price && <p className="text-xs text-destructive">{editErrors.price.message as string}</p>}
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditRowOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => {
        setIsDeleteDialogOpen(open);
        if (!open) setDeletingSeats([]);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {deletingSeats.length} seats from Row {deletingSeats[0]?.row}.
              This action cannot be undone. You cannot delete seats that are already tied to existing bookings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                executeDeleteGroup();
              }}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete {deletingSeats.length} Seats
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
