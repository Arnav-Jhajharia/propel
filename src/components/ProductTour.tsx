"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Step = {
  target: string; // CSS selector
  title?: string;
  content: string;
};

function getElementRect(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + rect.width / 2,
    centerY: rect.top + rect.height / 2,
  };
}

export default function ProductTour({ autoStart = false }: { autoStart?: boolean }) {
  const [run, setRun] = useState(false);
  const [index, setIndex] = useState(0);
  const [steps] = useState<Step[]>([
    { target: "[data-tour-id='navbar']", content: "This is your navigation bar and search." },
    { target: "[data-tour-id='sidebar']", content: "Access dashboard, properties and prospects here." },
    { target: "[data-tour-id='assistant-input']", content: "Ask the assistant anything from here." },
    { target: "[data-tour-id='properties-list']", content: "Your properties appear here." },
  ]);

  const [highlightRect, setHighlightRect] = useState<null | ReturnType<typeof getElementRect>>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  // Start once per session
  useEffect(() => {
    if (!autoStart) return;
    const key = "tour_seen_v1";
    if (!sessionStorage.getItem(key)) {
      setRun(true);
      sessionStorage.setItem(key, "1");
    }
  }, [autoStart]);

  // Compute current step rect
  useEffect(() => {
    if (!run) return;
    const step = steps[index];
    if (!step) return;
    const el = document.querySelector(step.target) as HTMLElement | null;
    if (!el) {
      setHighlightRect(null);
      return;
    }
    const update = () => setHighlightRect(getElementRect(el));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [run, index, steps]);

  const tooltipStyle = useMemo(() => {
    if (!highlightRect) return { top: 80, left: 80 } as const;
    const top = Math.max(16, highlightRect.top + highlightRect.height + 12);
    const left = Math.max(16, highlightRect.left);
    return { top, left } as const;
  }, [highlightRect]);

  if (!run) return null;

  const step = steps[index];
  if (!step) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dim background */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Highlight rectangle using CSS outline trick */}
      {highlightRect && (
        <div
          className="absolute rounded-xl shadow-[0_0_0_3px_rgba(255,255,255,0.9)] bg-transparent"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute bg-white rounded-xl border shadow-sm p-4 max-w-sm pointer-events-auto"
        style={tooltipStyle}
      >
        {step.title && <div className="font-medium mb-1">{step.title}</div>}
        <div className="text-sm text-foreground/80">{step.content}</div>
        <div className="mt-3 flex items-center gap-2 justify-end">
          <button
            className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted"
            onClick={() => setRun(false)}
          >
            Skip
          </button>
          {index > 0 && (
            <button
              className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </button>
          )}
          <button
            className="text-sm px-3 py-1.5 rounded-md bg-[#e9b6a5] text-white hover:opacity-90"
            onClick={() => {
              if (index < steps.length - 1) setIndex((i) => i + 1);
              else setRun(false);
            }}
          >
            {index < steps.length - 1 ? "Next" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}


