import { NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";

type Preferences = {
  timezone?: string;
  dateFormat?: "MDY" | "DMY" | "YMD";
  currency?: string;
  defaultPage?: string;
  tableDensity?: "comfortable" | "compact";
  reducedMotion?: boolean;
  developerMode?: boolean;
  betaFeatures?: boolean;
  emailNotifications?: boolean;
  desktopNotifications?: boolean;
  soundNotifications?: boolean;
  inAppToasts?: boolean;
  digestFrequency?: "off" | "daily" | "weekly";
};

function defaultPreferences(): Required<Preferences> {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    dateFormat: "DMY",
    currency: "SGD",
    defaultPage: "/",
    tableDensity: "comfortable",
    reducedMotion: false,
    developerMode: false,
    betaFeatures: false,
    emailNotifications: false,
    desktopNotifications: false,
    soundNotifications: false,
    inAppToasts: true,
    digestFrequency: "off",
  };
}

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const pm: any = user.privateMetadata || {};
    const prefs = { ...defaultPreferences(), ...(pm.preferences || {}) } as Preferences;
    return NextResponse.json(prefs);
  } catch (err) {
    console.error("preferences GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const incoming = (await request.json()) as Preferences;
    const pm: any = user.privateMetadata || {};
    const next = { ...(pm.preferences || {}), ...(incoming || {}) };

    await clerkClient.users.updateUser(userId, {
      privateMetadata: { ...pm, preferences: next },
    });

    return NextResponse.json({ success: true, preferences: next });
  } catch (err) {
    console.error("preferences PATCH error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";








