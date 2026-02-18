"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          Campaign performance analytics and trends.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex flex-col items-center justify-center py-16">
            <BarChart3 className="mb-4 h-12 w-12 opacity-50" />
            <p className="text-lg font-medium">
              Analytics dashboard is under construction.
            </p>
            <p className="text-sm">
              Charts and trend data will appear here once connected.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
