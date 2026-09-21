"use client";

import Link from "next/link";
import { Music, Laugh, Theater, Trophy, MonitorPlay, Mic2, Star, Sparkles } from "lucide-react";
import { Category } from "@/types/event";

interface CategoryIconListProps {
  categories: Category[];
}

// Map category names to Lucide icons (fallback to Sparkles)
const getCategoryIcon = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("music") || normalized.includes("concert")) return Music;
  if (normalized.includes("comedy") || normalized.includes("stand")) return Laugh;
  if (normalized.includes("theatre") || normalized.includes("play")) return Theater;
  if (normalized.includes("sport")) return Trophy;
  if (normalized.includes("tech") || normalized.includes("workshop")) return MonitorPlay;
  if (normalized.includes("talk") || normalized.includes("podcast")) return Mic2;
  if (normalized.includes("special")) return Star;
  return Sparkles;
};

export function CategoryIconList({ categories }: CategoryIconListProps) {
  if (!categories || categories.length === 0) return null;

  // Take top 6 categories to keep it clean
  const displayCategories = categories.slice(0, 6);

  return (
    <div className="mb-12">
      <h3 className="text-xl font-bold text-[#0A1526] mb-6">Browse by Category</h3>
      <div className="flex flex-wrap gap-4 md:gap-6">
        {displayCategories.map((category) => {
          const Icon = getCategoryIcon(category.name);
          return (
            <Link
              key={category.id}
              href={`/events?category=${category.id}`}
              className="group flex flex-col items-center gap-3 w-24 md:w-28"
            >
              <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-white shadow-[0_4px_16px_rgb(0,0,0,0.03)] border border-slate-100 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_8px_24px_rgb(0,0,0,0.08)] group-hover:border-[#3B41C5]/20">
                <Icon className="h-7 w-7 md:h-8 md:w-8 text-[#3B41C5]" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-slate-700 text-center group-hover:text-[#0A1526] transition-colors line-clamp-1">
                {category.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
