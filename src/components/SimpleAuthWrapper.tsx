"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";

interface SimpleAuthWrapperProps {
  children: React.ReactNode;
}

export default function SimpleAuthWrapper({ children }: SimpleAuthWrapperProps) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
