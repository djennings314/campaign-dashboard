"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure your API connections.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            API keys are configured via environment variables. Set these in your
            .env.local file (or Vercel environment variables for production).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">HeyReach API Key</label>
            <Input
              type="password"
              placeholder="Set via HEYREACH_API_KEY env var"
              disabled
            />
            <p className="text-muted-foreground text-xs">
              Base URL: HEYREACH_API_URL (default: https://api.heyreach.io/api/public)
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Smartlead API Key</label>
            <Input
              type="password"
              placeholder="Set via SMARTLEAD_API_KEY env var"
              disabled
            />
            <p className="text-muted-foreground text-xs">
              Base URL: SMARTLEAD_API_URL (default: https://server.smartlead.ai/api/v1)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
