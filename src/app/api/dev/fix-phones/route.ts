import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fixPhoneNumbers } from "@/lib/db/fix-phone-numbers";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await fixPhoneNumbers();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("fix-phones error", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

