"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useWizard, EventType } from "./wizard-context";
import { eventService } from "@/services/event.service";
import { Category } from "@/types/event";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(255, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Please select a category"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  age_limit: z.string().refine(val => !val || parseInt(val) >= 1, "Age limit must be at least 1").optional(),
  language: z.string().max(50).optional(),
  event_type: z.enum(["SEATED", "GENERAL"]),
  event_image: z.any()
    .refine((file) => !file || file?.size <= MAX_FILE_SIZE, "Max image size is 5MB.")
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file?.type),
      "Only .jpg, .jpeg, .png and .webp supported."
    )
    .optional(),
}).refine((data) => {
  return new Date(data.start_date) < new Date(data.end_date);
}, {
  message: "End date must be after start date",
  path: ["end_date"],
});

type FormValues = z.infer<typeof formSchema>;

export default function Step1EventInfo() {
  const { setStep, step1Data, setStep1Data, setEventType } = useWizard();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: step1Data || {
      title: "",
      description: "",
      category: "",
      start_date: "",
      end_date: "",
      age_limit: "",
      language: "",
      event_type: "GENERAL",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const cats = await eventService.getCategories();
        setCategories(cats.filter(c => c.is_active));
      } catch (err) {
        toast({ title: "Error", description: "Failed to load categories", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [toast]);

  const onSubmit = (data: FormValues) => {
    setStep1Data(data);
    setEventType(data.event_type as EventType);
    setStep(2);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-12 flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const { register, handleSubmit, formState: { errors }, setValue, watch } = form;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Information</CardTitle>
        <CardDescription>Enter the basic details about your event.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          
          <div className="space-y-2">
            <Label>Event Type <span className="text-red-500">*</span></Label>
            <RadioGroup 
              defaultValue={watch("event_type")} 
              onValueChange={(val) => setValue("event_type", val as any)}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex items-center space-x-2 border p-4 rounded-md flex-1 cursor-pointer hover:bg-slate-50">
                <RadioGroupItem value="GENERAL" id="r1" />
                <Label htmlFor="r1" className="cursor-pointer">
                  General Admission
                  <span className="block text-sm text-muted-foreground font-normal">Non-seated, standing, or free-seating</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border p-4 rounded-md flex-1 cursor-pointer hover:bg-slate-50">
                <RadioGroupItem value="SEATED" id="r2" />
                <Label htmlFor="r2" className="cursor-pointer">
                  Seated Event
                  <span className="block text-sm text-muted-foreground font-normal">Specific seat numbers and rows</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="title">Event Name <span className="text-red-500">*</span></Label>
              <Input id="title" placeholder="e.g., Summer Music Festival" {...register("title")} />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
              <Select onValueChange={(val) => setValue("category", val as string)} value={(watch("category") as string) || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-red-500">{errors.category.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea 
              id="description" 
              placeholder="Describe your event..." 
              className="min-h-[120px]"
              {...register("description")} 
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time <span className="text-red-500">*</span></Label>
              <Input type="datetime-local" id="start_date" {...register("start_date")} />
              {errors.start_date && <p className="text-sm text-red-500">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time <span className="text-red-500">*</span></Label>
              <Input type="datetime-local" id="end_date" {...register("end_date")} />
              {errors.end_date && <p className="text-sm text-red-500">{errors.end_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="age_limit">Age Limit (Optional)</Label>
              <Input type="number" id="age_limit" placeholder="e.g., 18" {...register("age_limit")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language (Optional)</Label>
              <Input id="language" placeholder="e.g., English, Hindi" {...register("language")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_image">Event Image (Optional)</Label>
            <Input 
              id="event_image" 
              type="file" 
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setValue("event_image", file);
              }}
            />
            {errors.event_image && <p className="text-sm text-red-500">{errors.event_image?.message?.toString()}</p>}
          </div>

        </CardContent>
        <CardFooter className="flex justify-end">
          <Button type="submit" size="lg">
            Continue to Venue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
