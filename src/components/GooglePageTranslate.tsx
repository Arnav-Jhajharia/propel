"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/provider";

declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

function loadGoogleElementScript() {
  return new Promise<void>((resolve) => {
    if (window.google?.translate) return resolve();
    if (document.getElementById("google-translate-script")) return resolve();
    const s = document.createElement("script");
    s.id = "google-translate-script";
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
    const check = () => {
      if (window.google?.translate) resolve();
      else setTimeout(check, 200);
    };
    setTimeout(check, 300);
  });
}

export default function GooglePageTranslate() {
  const { locale } = useI18n();
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    // Create hidden container for the widget (required by API)
    if (!document.getElementById("google_translate_element")) {
      const div = document.createElement("div");
      div.id = "google_translate_element";
      div.style.display = "none";
      document.body.appendChild(div);
    }

    window.googleTranslateElementInit = function () {
      try {
        // pageLanguage 'en' (source), allow en and zh-CN switching
        // eslint-disable-next-line new-cap
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: "en,zh-CN",
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          "google_translate_element"
        );
      } catch {}
    };

    loadGoogleElementScript();
  }, []);

  useEffect(() => {
    const setCookie = (name: string, value: string, domain?: string) => {
      const parts = [
        `${name}=${value}`,
        `path=/`,
        `expires=${new Date(Date.now() + 365 * 24 * 3600 * 1000).toUTCString()}`,
      ];
      if (domain) parts.push(`domain=${domain}`);
      document.cookie = parts.join("; ");
    };

    const applyByCombo = (code: string) => {
      let attempts = 0;
      const maxAttempts = 15; // ~6s
      const tick = () => {
        const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
        if (combo) {
          if (combo.value !== code) {
            combo.value = code;
            combo.dispatchEvent(new Event("change"));
          }
          return;
        }
        attempts += 1;
        if (attempts < maxAttempts) setTimeout(tick, 400);
        else window.googleTranslateElementInit?.();
      };
      tick();
    };

    // If Orchids visual edit mode is active, force English to prevent DOM rewrites
    let orchidsActive = false;
    try {
      orchidsActive = localStorage.getItem("orchids_visual_edit_mode") === "true";
    } catch {}

    const target = orchidsActive ? "en" : locale === "zh" ? "zh-CN" : "en";
    const cookieValue = `/en/${target}`;

    // Set googtrans cookie for both current host and bare domain if available
    try {
      setCookie("googtrans", cookieValue);
      const host = window.location.hostname;
      if (host && host.split(".").length > 1) {
        const bare = host.startsWith(".") ? host : `.${host}`;
        setCookie("googtrans", cookieValue, bare);
      }
    } catch {}

    applyByCombo(target);
  }, [locale]);

  return null;
}


