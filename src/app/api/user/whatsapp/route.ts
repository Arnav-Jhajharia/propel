import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  try {
    const { whatsappToken, whatsappPhoneId } = await request.json();

    if (!whatsappToken || !whatsappPhoneId) {
      return NextResponse.json({ error: "Missing WhatsApp credentials" }, { status: 400 });
    }

    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await clerkClient.users.updateUser(userId, {
      privateMetadata: {
        whatsappToken,
        whatsappPhoneId,
        whatsappConnectedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true, message: "WhatsApp credentials saved" });
  } catch (error) {
    console.error("Error updating WhatsApp credentials:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
