"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";

export default function BotConfigDebugPage() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/bot-config/debug');
      const data = await response.json();
      setConfigs(data.configs || []);
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Bot Configuration Debug</h1>
            <p className="text-sm text-muted-foreground mt-1">View what's actually in the database</p>
          </div>
          <Button onClick={loadConfigs} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : configs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No configurations found</div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant={config.isActive ? "default" : "outline"}>
                          {config.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">{config.scope}</Badge>
                        <Badge variant="secondary">
                          {config.automatedPhases.length} phases
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(config.createdAt).toLocaleString()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Automated Phases */}
                  <div>
                    <p className="text-sm font-medium mb-2">Automated Phases:</p>
                    <div className="flex flex-wrap gap-2">
                      {config.automatedPhases.map((phase: string) => (
                        <Badge key={phase} variant="secondary">{phase}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Screening Questions */}
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Screening Questions: 
                      <Badge className="ml-2">{config.screeningQuestions.length}</Badge>
                    </p>
                    {config.screeningQuestions.length > 0 ? (
                      <div className="space-y-2">
                        {config.screeningOpeningMessage && (
                          <div className="p-3 bg-muted rounded-lg text-sm">
                            <span className="font-medium">Opening:</span> {config.screeningOpeningMessage}
                          </div>
                        )}
                        {config.screeningQuestions.map((q: any, idx: number) => (
                          <div key={idx} className="p-3 bg-muted rounded-lg text-sm">
                            <span className="font-medium">{idx + 1}. {q.label}:</span> {q.prompt}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No custom screening questions configured</p>
                    )}
                  </div>

                  {/* Full JSON */}
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium mb-2">View Full JSON</summary>
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                      {JSON.stringify(config.fullConfig, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

