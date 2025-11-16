"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, GripVertical } from "lucide-react";

type ScreeningQuestion = {
  id: string;
  label: string;
  prompt: string;
};

const DEFAULT_QUESTIONS: ScreeningQuestion[] = [
  { id: '1', label: 'Monthly Budget', prompt: 'What\'s your monthly budget?' },
  { id: '2', label: 'Move-in Date', prompt: 'When do you need to move in?' },
  { id: '3', label: 'Employment Status', prompt: 'What\'s your employment status?' },
  { id: '4', label: 'Number of Occupants', prompt: 'How many people will be living here?' },
];

type ScreeningConfigurationProps = {
  initialConfig?: { openingMessage?: string; questions?: ScreeningQuestion[] };
  onConfigChange?: (config: { openingMessage: string; questions: ScreeningQuestion[] }) => void;
};

export function ScreeningConfiguration({ initialConfig, onConfigChange }: ScreeningConfigurationProps = {}) {
  const [questions, setQuestions] = useState<ScreeningQuestion[]>(
    initialConfig?.questions || DEFAULT_QUESTIONS
  );
  const [openingMessage, setOpeningMessage] = useState(
    initialConfig?.openingMessage || 'Great! Let me ask you a few quick questions.'
  );

  // Send config on mount or when initialized
  useEffect(() => {
    console.log('[ScreeningConfiguration] Sending initial config:', {
      openingMessage,
      questionsCount: questions.length,
      questions
    });
    if (onConfigChange) {
      onConfigChange({
        openingMessage,
        questions
      });
    }
  }, []); // Only on mount

  // Notify parent when config changes
  const notifyChange = (newQuestions?: ScreeningQuestion[], newMessage?: string) => {
    if (onConfigChange) {
      onConfigChange({
        openingMessage: newMessage || openingMessage,
        questions: newQuestions || questions
      });
    }
  };

  const addQuestion = () => {
    const newQuestions = [...questions, {
      id: Date.now().toString(),
      label: '',
      prompt: ''
    }];
    setQuestions(newQuestions);
    notifyChange(newQuestions);
  };

  const updateQuestion = (id: string, field: 'label' | 'prompt', value: string) => {
    const updated = questions.map(q => q.id === id ? { ...q, [field]: value } : q);
    setQuestions(updated);
    notifyChange(updated);
  };

  const removeQuestion = (id: string) => {
    const filtered = questions.filter(q => q.id !== id);
    setQuestions(filtered);
    notifyChange(filtered);
  };

  return (
    <div className="space-y-8">
      {/* Opening Message */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Opening Message</Label>
          <Textarea
            value={openingMessage}
            onChange={(e) => {
              setOpeningMessage(e.target.value);
              notifyChange(undefined, e.target.value);
            }}
            placeholder="How the bot starts screening..."
            rows={2}
            className="resize-none"
          />
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Screening Questions</Label>
          <Button onClick={addQuestion} size="sm" variant="ghost">
            <Plus className="w-4 h-4 mr-1" />
            Add Question
          </Button>
        </div>

        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
              <div className="flex items-center gap-2 pt-2">
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                <span className="text-xs text-muted-foreground font-medium w-4">{idx + 1}</span>
              </div>
              
              <div className="flex-1 space-y-2">
                <Input
                  value={q.label}
                  onChange={(e) => updateQuestion(q.id, 'label', e.target.value)}
                  placeholder="Label"
                  className="text-sm h-9"
                />
                <Input
                  value={q.prompt}
                  onChange={(e) => updateQuestion(q.id, 'prompt', e.target.value)}
                  placeholder="What the bot asks..."
                  className="text-sm h-9"
                />
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 mt-0.5"
                onClick={() => removeQuestion(q.id)}
              >
                <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2 p-4 rounded-lg bg-muted/30 border">
        <p className="text-sm font-medium text-muted-foreground">Bot will send:</p>
        <div className="text-sm space-y-1">
          <p>{openingMessage}</p>
          {questions.map((q, idx) => q.prompt && (
            <p key={q.id} className="text-muted-foreground">
              {idx + 1}) {q.prompt}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
