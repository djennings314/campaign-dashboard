"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  loading?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
  className,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={cn("py-4", className)}>
        <CardContent className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="flex items-center gap-4">
        {Icon && (
          <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-muted-foreground text-xs">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                "text-xs font-medium",
                trend.value >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
