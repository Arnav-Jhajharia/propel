"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type FieldType = "text" | "number" | "date" | "yesno";
type Field = { id: string; type: FieldType; label: string; required?: boolean };

function bankDefaults(): Field[] {
  return [
    { id: crypto.randomUUID(), type: "text", label: "Nationality / Pass Type", required: true },
    { id: crypto.randomUUID(), type: "text", label: "Occupation", required: true },
    { id: crypto.randomUUID(), type: "text", label: "Number of tenants & gender", required: true },
    { id: crypto.randomUUID(), type: "date", label: "Move-in date", required: true },
    { id: crypto.randomUUID(), type: "number", label: "Budget (SGD)" },
    { id: crypto.randomUUID(), type: "yesno", label: "Any pets?" },
    { id: crypto.randomUUID(), type: "text", label: "Preferred areas" },
  ];
}

export default function ScreeningBuilder() {
  const [name, setName] = useState("Default Intake");
  const [bank, setBank] = useState<Field[]>(bankDefaults());
  const [selected, setSelected] = useState<Field[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [samples, setSamples] = useState<string[]>([]);
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/user/screening");
        if (res.ok) {
          const data = await res.json();
          setName(data?.name || "Default Intake");
          const loaded: Field[] = (data?.fields || []).map((f: any) => ({ id: crypto.randomUUID(), type: f.type, label: f.label, required: !!f.required }));
          setSelected(loaded);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addCustomToBank = () => {
    const label = newLabel.trim();
    if (!label) return;
    setBank((b) => [...b, { id: crypto.randomUUID(), type: newType, label }]);
    setNewLabel("");
    setNewType("text");
  };

  const onSave = async () => {
    try {
      setSaving(true);
      const payload = selected.map(({ id, ...rest }) => rest);
      const res = await fetch("/api/user/screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fields: payload }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json().catch(() => ({}));
      setSamples(Array.isArray(data?.samples) ? data.samples : []);
    } finally {
      setSaving(false);
    }
  };

  // Drag & drop from bank to selected
  const onBankDragStart = (q: Field) => (e: React.DragEvent) => {
    e.dataTransfer.setData("application/x-question", JSON.stringify({ type: q.type, label: q.label, required: q.required }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const onSelectedDropNew = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-question");
    if (!raw) return;
    try {
      const q = JSON.parse(raw) as Omit<Field, "id">;
      setSelected((s) => [...s, { id: crypto.randomUUID(), ...q }]);
    } catch {}
  };

  // Reorder inside selected
  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null || from === index) return;
    setSelected((arr) => {
      const next = [...arr];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Screening questionnaire</CardTitle>
        </CardHeader>
        <CardContent>Loading…</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Screening questionnaire</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
          {/* Left: Question bank */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Question bank</div>
            <div className="space-y-2">
              {bank.map((q) => (
                <div key={q.id} className="border rounded-md p-2 flex items-center justify-between" draggable onDragStart={onBankDragStart(q)}>
                  <div className="text-sm">{q.label}</div>
                  <Button size="sm" variant="secondary" onClick={() => setSelected((s) => [...s, { id: crypto.randomUUID(), type: q.type, label: q.label, required: q.required }])}>Add</Button>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t mt-3 space-y-2">
              <div className="text-xs text-muted-foreground">Add to bank</div>
              <div className="grid gap-2">
                <Label>Label</Label>
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Employer / Company" />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <div className="flex gap-2">
                  {(["text", "number", "date", "yesno"] as FieldType[]).map((t) => (
                    <Button key={t} size="sm" variant={newType === t ? "default" : "outline"} onClick={() => setNewType(t)}>
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
              <Button onClick={addCustomToBank} disabled={!newLabel.trim()}>Add to bank</Button>
              <div className="text-xs text-muted-foreground">Tip: Drag questions from the bank into your form.</div>
            </div>
          </div>

          {/* Right: Your form */}
          <div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelected([])}>Clear</Button>
                <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </div>
            </div>

            <div className="mt-4 space-y-3 min-h-40 border rounded-md p-3 bg-white" onDragOver={(e) => e.preventDefault()} onDrop={onSelectedDropNew}>
              {selected.map((f, i) => (
                <div key={f.id} className="rounded-md border p-3" draggable onDragStart={handleDragStart(i)} onDragOver={handleDragOver(i)} onDrop={handleDrop(i)}>
                  <div className="flex items-center justify-between gap-2">
                    <Input value={f.label} onChange={(e) => setSelected((arr) => arr.map((x) => x.id === f.id ? { ...x, label: e.target.value } : x))} />
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground">Required</div>
                      <Switch checked={!!f.required} onCheckedChange={(v) => setSelected((arr) => arr.map((x) => x.id === f.id ? { ...x, required: v } : x))} />
                      <Button variant="ghost" size="sm" onClick={() => setSelected((arr) => arr.filter((x) => x.id !== f.id))}>Remove</Button>
                    </div>
                  </div>
                </div>
              ))}
              {selected.length === 0 && (
                <div className="text-sm text-muted-foreground">Drag questions here from the left to build your form.</div>
              )}
            </div>

            {samples.length > 0 && (
              <div className="mt-6 border rounded-md p-3">
                <div className="text-sm font-medium mb-2">Sample WhatsApp drafts</div>
                <div className="space-y-2">
                  {samples.map((s, i) => (
                    <div key={i} className="border rounded-md p-2 flex items-start justify-between gap-2">
                      <div className="text-sm whitespace-pre-wrap flex-1">{s}</div>
                      <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(s)}>Copy</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


