"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function UserMenu() {
  const router = useRouter();
  return (
    <>
      <SignedIn>
        <UserButton afterSignOutUrl="/sign-in" appearance={{ elements: { avatarBox: "h-9 w-9" } }} />
      </SignedIn>
      <SignedOut>
        <Button variant="ghost" size="sm" onClick={() => router.push("/sign-in")}>Sign in</Button>
      </SignedOut>
    </>
  );
}
