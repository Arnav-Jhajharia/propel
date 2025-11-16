"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserCheck, MessageCircle, Calendar, Mail, Shield, AlertCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScreeningConfiguration } from "@/components/ScreeningConfiguration";
import { QAConfiguration } from "@/components/QAConfiguration";
import { ViewingConfiguration } from "@/components/ViewingConfiguration";
import { FollowUpConfiguration } from "@/components/FollowUpConfiguration";
import { ApprovalsConfiguration } from "@/components/ApprovalsConfiguration";
import { FallbackConfiguration } from "@/components/FallbackConfiguration";
import { TryBotModal } from "@/components/TryBotModal";

type WorkflowNode = {
  id: string;
  name: string;
  icon: any;
  enabled: boolean;
};

const MAIN_NODES: WorkflowNode[] = [
  { id: 'screening', name: 'Screening', icon: UserCheck, enabled: true },
  { id: 'qa', name: 'Q&A', icon: MessageCircle, enabled: true },
  { id: 'viewing', name: 'Viewing', icon: Calendar, enabled: true },
  { id: 'followup', name: 'Follow-up', icon: Mail, enabled: true },
];

const CONTROL_NODES: WorkflowNode[] = [
  { id: 'approvals', name: 'Approvals', icon: Shield, enabled: true },
  { id: 'fallback', name: 'Fallback', icon: AlertCircle, enabled: true },
];

export default function BotSettingsPage() {
  const [mainNodes, setMainNodes] = useState<WorkflowNode[]>(MAIN_NODES);
  const [controlNodes, setControlNodes] = useState<WorkflowNode[]>(CONTROL_NODES);
  const [selectedNode, setSelectedNode] = useState<string>('screening');
  const [showTryOut, setShowTryOut] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Store phase-specific configs (loaded from database)
  const [screeningConfig, setScreeningConfig] = useState<any>(null);

  const allNodes = [...mainNodes, ...controlNodes];

  // Load existing configuration on mount
  useEffect(() => {
    loadExistingConfig();
  }, []);

  const loadExistingConfig = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/bot-config');
      if (!response.ok) throw new Error('Failed to load config');
      
      const data = await response.json();
      console.log('[bot-settings] Loaded existing config:', data);
      
      if (data.configs && data.configs.length > 0) {
        const latestConfig = data.configs[data.configs.length - 1];
        const parsed = typeof latestConfig.parsedConfig === 'string'
          ? JSON.parse(latestConfig.parsedConfig)
          : latestConfig.parsedConfig;
        
        console.log('[bot-settings] Parsed config:', parsed);
        
        // Load screening config
        if (parsed.phaseSettings?.screening) {
          setScreeningConfig(parsed.phaseSettings.screening);
          console.log('[bot-settings] Loaded screening config:', parsed.phaseSettings.screening);
        }
        
        // Update enabled/disabled states based on loaded config
        if (parsed.automatedPhases) {
          const phaseMap: Record<string, string> = {
            'screening': 'screening',
            'property_qa': 'qa',
            'viewing_proposal': 'viewing',
            'followup': 'followup'
          };
          
          setMainNodes(mainNodes.map(n => ({
            ...n,
            enabled: parsed.automatedPhases.some((p: string) => phaseMap[p] === n.id)
          })));
        }
      }
    } catch (error) {
      console.error('[bot-settings] Failed to load config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setMainNodes(mainNodes.map(n => n.id === nodeId ? { ...n, enabled: !n.enabled } : n));
    setControlNodes(controlNodes.map(n => n.id === nodeId ? { ...n, enabled: !n.enabled } : n));
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      // Build automation config from current settings
      const automatedPhases = mainNodes
        .filter(n => n.enabled)
        .map(n => {
          // Map UI node IDs to agent phase IDs
          const phaseMap: Record<string, string> = {
            'screening': 'screening',
            'qa': 'property_qa',
            'viewing': 'viewing_proposal',
            'followup': 'followup'
          };
          return phaseMap[n.id] || n.id;
        });

      const config = {
        automatedPhases,
        maxPhase: automatedPhases.length > 0 ? 'full' : 'none',
        requireApproval: {
          beforeScreening: false,
          beforePropertyAdd: false,
          beforeViewingProposal: false,
          beforeViewingBooking: false,
        },
        behavior: {
          tone: 'professional',
          responseSpeed: 'instant',
          autoFollowUp: mainNodes.find(n => n.id === 'followup')?.enabled || false,
        },
        phaseSettings: {
          screening: screeningConfig ? {
            openingMessage: screeningConfig.openingMessage,
            questions: screeningConfig.questions
          } : undefined,
          viewing: {
            autoPropose: true, // From ViewingConfiguration
            autoBook: false,
            triggerAfterQA: true,
          }
        }
      };

      console.log('[bot-settings] ===== SAVE DEBUG =====');
      console.log('[bot-settings] screeningConfig state:', screeningConfig);
      console.log('[bot-settings] Full config being saved:', JSON.stringify(config, null, 2));
      console.log('[bot-settings] Screening questions count:', config.phaseSettings?.screening?.questions?.length || 0);

      const response = await fetch('/api/bot-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bot Configuration',
          naturalLanguageInput: 'Visual configuration',
          parsedConfig: config, // Don't double stringify
          scope: 'global',
        }),
      });

      const result = await response.json();
      console.log('[bot-settings] Save result:', result);

      if (!response.ok) {
        console.error('[bot-settings] API Error:', result);
        throw new Error(result.error || result.details || 'Failed to save');
      }

      alert('✅ Configuration saved! Your bot will now follow these settings.');
    } catch (error: any) {
      console.error('[bot-settings] Save error:', error);
      alert(`❌ Failed to save configuration:\n\n${error.message}\n\nCheck browser console for details.`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedNodeData = allNodes.find(n => n.id === selectedNode);

  return (
    <AppShell>
      <div className="h-[calc(100vh-8rem)] flex">
        {/* Left Sidebar - Vertical Node List */}
        <div className="w-64 border-r pr-6 space-y-4">
          {/* Main Automation Phases */}
          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold mb-1">Automation Phases</h3>
              <p className="text-xs text-muted-foreground">Main workflow steps</p>
            </div>

            <div className="space-y-2">
              {mainNodes.map((node) => {
                const Icon = node.icon;
                const isSelected = selectedNode === node.id;
                
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                      isSelected 
                        ? "bg-primary/10 border-2 border-primary" 
                        : "hover:bg-muted border-2 border-transparent",
                      !node.enabled && "opacity-50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      node.enabled ? "bg-[#FF6B4A]" : "bg-gray-200"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        node.enabled ? "text-white" : "text-gray-400"
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{node.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {node.enabled ? 'Active' : 'Disabled'}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Control Settings */}
          <div>
            <div className="mb-3 pt-4 border-t">
              <h3 className="text-sm font-semibold mb-1">Control Settings</h3>
              <p className="text-xs text-muted-foreground">Approval & error handling</p>
            </div>

            <div className="space-y-2">
              {controlNodes.map((node) => {
                const Icon = node.icon;
                const isSelected = selectedNode === node.id;
                
                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                      isSelected 
                        ? "bg-primary/10 border-2 border-primary" 
                        : "hover:bg-muted border-2 border-transparent"
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-100">
                      <Icon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{node.name}</div>
                      <div className="text-xs text-muted-foreground">Settings</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Content Area - Configuration */}
        <div className="flex-1 pl-6 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">{selectedNodeData?.name} Configuration</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure how the bot handles this phase
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => toggleNode(selectedNode)}
              >
                {selectedNodeData?.enabled ? 'Disable' : 'Enable'} Phase
              </Button>
              <Button
                onClick={handleSaveConfiguration}
                disabled={isSaving}
                variant="default"
              >
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button onClick={() => setShowTryOut(true)} variant="outline">
                Try it out
              </Button>
            </div>
          </div>

          {/* Configuration Content */}
          <div className="flex-1 overflow-y-auto pr-2">
            {selectedNode === 'screening' && !isLoading && (
              <ScreeningConfiguration 
                initialConfig={screeningConfig}
                onConfigChange={(config) => setScreeningConfig(config)}
              />
            )}
            {selectedNode === 'qa' && <QAConfiguration />}
            {selectedNode === 'viewing' && <ViewingConfiguration />}
            {selectedNode === 'followup' && <FollowUpConfiguration />}
            {selectedNode === 'approvals' && <ApprovalsConfiguration />}
            {selectedNode === 'fallback' && <FallbackConfiguration />}
          </div>
        </div>
      </div>

      {/* Try It Out Modal */}
      {showTryOut && <TryBotModal onClose={() => setShowTryOut(false)} />}
    </AppShell>
  );
}
