"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/provider";

type Cache = Record<string, string>;

function isInsideOrchidsElement(node: Node): boolean {
  let el: HTMLElement | null = (node as any).parentElement || null;
  while (el) {
    if (el.hasAttribute && (el.hasAttribute("data-orchids-id") || el.hasAttribute("data-orchids-protected"))) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function collectTextNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node: Node) => {
      const text = node.textContent?.trim() || "";
      if (!text) return NodeFilter.FILTER_REJECT;
      // Ignore scripts, styles, code, pre, input/textarea content
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName.toLowerCase();
      if (["script", "style", "code", "pre", "noscript"].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
      // Skip anything inside Orchids-marked elements
      if (isInsideOrchidsElement(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  } as any);
  const nodes: Text[] = [];
  let current: Node | null = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

export default function AutoTranslator() {
  const { locale } = useI18n();
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (locale !== "zh") return; // only auto-translate when zh selected
    // If Google Page Translate is present, skip our API-based translator to avoid conflicts
    if (typeof window !== "undefined" && (window as any).google?.translate) return;
    // If Orchids visual edit mode is active, do not mutate DOM
    try {
      const orchidsActive = localStorage.getItem("orchids_visual_edit_mode") === "true";
      if (orchidsActive) return;
    } catch {}

    const cacheKey = "auto_translate_cache_zh";
    const cache: Cache = (() => {
      try {
        return JSON.parse(localStorage.getItem(cacheKey) || "{}");
      } catch {
        return {};
      }
    })();

    let abort = false;

    const translateBatch = async (texts: string[]) => {
      if (texts.length === 0) return {} as Record<string, string>;
      const resp = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, target: "zh" }),
      });
      if (!resp.ok) return {} as Record<string, string>;
      const data = await resp.json();
      return (data?.translations || {}) as Record<string, string>;
    };

    const run = async () => {
      const nodes = collectTextNodes(document.body);
      const candidates: string[] = [];
      for (const n of nodes) {
        const original = n.textContent || "";
        if (!original.trim()) continue;
        if (!cache[original]) candidates.push(original);
      }

      const unique = Array.from(new Set(candidates)).slice(0, 128);
      const translations = await translateBatch(unique);
      Object.assign(cache, translations);
      localStorage.setItem(cacheKey, JSON.stringify(cache));

      for (const n of nodes) {
        if (abort) return;
        const original = n.textContent || "";
        const translated = cache[original];
        if (translated && translated !== original) {
          n.textContent = translated;
        }
      }
    };

    run();

    // Observe new DOM mutations to translate dynamically added content
    observerRef.current?.disconnect();
    const obs = new MutationObserver(() => {
      if (abort) return;
      run();
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    observerRef.current = obs;

    return () => {
      abort = true;
      observerRef.current?.disconnect();
    };
  }, [locale]);

  return null;
}


