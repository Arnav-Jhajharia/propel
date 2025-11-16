"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type PropertyFact = {
  id: string;
  keyword: string;
  response: string;
};

const DEFAULT_FACTS: PropertyFact[] = [
  { id: '1', keyword: 'price, rent, cost', response: 'The monthly rent is ${price}' },
  { id: '2', keyword: 'size, sqft, area', response: 'This property is ${sqft} sqft' },
  { id: '3', keyword: 'bedroom, bed', response: 'It has ${bedrooms} bedrooms and ${bathrooms} bathrooms' },
  { id: '4', keyword: 'furnished', response: 'It comes ${furnished}' },
  { id: '5', keyword: 'location, address, where', response: 'Located at ${address}' },
  { id: '6', keyword: 'available, move-in', response: 'Available from ${availableFrom}' },
];

type QAConfigurationProps = {
  initialConfig?: any;
  onConfigChange?: (config: any) => void;
};

export function QAConfiguration({ initialConfig, onConfigChange }: QAConfigurationProps = {}) {
  const [facts, setFacts] = useState<PropertyFact[]>(initialConfig?.facts || DEFAULT_FACTS);
  const [autoDetectProperty, setAutoDetectProperty] = useState(initialConfig?.autoDetectProperty ?? true);
  const [fallbackMessage, setFallbackMessage] = useState(initialConfig?.fallbackMessage || "Let me check on that for you. Could you be more specific?");

  // Send config on mount
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange({
        autoDetectProperty,
        facts,
        fallbackMessage
      });
    }
  }, []); // Only on mount

  // Notify parent when config changes
  const notifyChange = (newFacts?: PropertyFact[], newAutoDetect?: boolean, newFallback?: string) => {
    if (onConfigChange) {
      onConfigChange({
        autoDetectProperty: newAutoDetect !== undefined ? newAutoDetect : autoDetectProperty,
        facts: newFacts || facts,
        fallbackMessage: newFallback || fallbackMessage
      });
    }
  };

  const addFact = () => {
    const newFacts = [...facts, {
      id: Date.now().toString(),
      keyword: '',
      response: ''
    }];
    setFacts(newFacts);
    notifyChange(newFacts);
  };

  const updateFact = (id: string, field: 'keyword' | 'response', value: string) => {
    const updated = facts.map(f => f.id === id ? { ...f, [field]: value } : f);
    setFacts(updated);
    notifyChange(updated);
  };

  const removeFact = (id: string) => {
    const filtered = facts.filter(f => f.id !== id);
    setFacts(filtered);
    notifyChange(filtered);
  };

  return (
    <div className="space-y-8">
      {/* Auto-detect Setting */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div>
          <Label className="text-sm font-medium">Auto-detect Property from URL</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Automatically add properties when user shares PropertyGuru/99.co links</p>
        </div>
        <Switch checked={autoDetectProperty} onCheckedChange={(checked) => {
          setAutoDetectProperty(checked);
          notifyChange(undefined, checked);
        }} />
      </div>

      {/* Property Facts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Property Information Responses</Label>
          <Button onClick={addFact} size="sm" variant="ghost">
            <Plus className="w-4 h-4 mr-1" />
            Add Response
          </Button>
        </div>

        <div className="space-y-2">
          {facts.map((fact) => (
            <div key={fact.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Trigger Keywords</Label>
                  <Input
                    value={fact.keyword}
                    onChange={(e) => updateFact(fact.id, 'keyword', e.target.value)}
                    placeholder="e.g., price, rent, cost"
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bot Response</Label>
                  <Input
                    value={fact.response}
                    onChange={(e) => updateFact(fact.id, 'response', e.target.value)}
                    placeholder="e.g., The rent is ${price}/month"
                    className="text-sm h-9"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => removeFact(fact.id)}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Fallback Response */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Fallback Response</Label>
        <p className="text-xs text-muted-foreground">When bot doesn't know the answer</p>
        <Textarea
          value={fallbackMessage}
          onChange={(e) => {
            setFallbackMessage(e.target.value);
            notifyChange(undefined, undefined, e.target.value);
          }}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Example Interactions:</p>
        <div className="text-sm space-y-1.5">
          <div>
            <span className="font-medium">User:</span> "What's the rent?"
            <br />
            <span className="text-muted-foreground">Bot:</span> {facts[0]?.response || 'The monthly rent is ${price}'}
          </div>
          <div>
            <span className="font-medium">User:</span> "How big is it?"
            <br />
            <span className="text-muted-foreground">Bot:</span> {facts[1]?.response || 'This property is ${sqft} sqft'}
          </div>
        </div>
      </div>
    </div>
  );
}

