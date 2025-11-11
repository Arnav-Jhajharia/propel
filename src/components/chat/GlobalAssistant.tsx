"use client";

import { usePathname } from "next/navigation";
import AssistantWidget from "./AssistantWidget";

export default function GlobalAssistant() {
  const pathname = usePathname();

  // Hide on auth/onboarding pages or when user is not signed in
  const hiddenRoutes = ["/sign-in", "/sign-up", "/onboarding", "/login", "/chat"];
  const shouldHide = hiddenRoutes.some((p) => pathname.startsWith(p));

  if (shouldHide) return null;

  // Show chatbot on all other pages (not initially hidden)
  return <AssistantWidget initiallyHidden={false} lockedUntilReveal={false} />;
}


