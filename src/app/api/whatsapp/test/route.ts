import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pm: any = user.privateMetadata || {};
    const whatsappToken = pm.whatsappToken as string | undefined;
    const phoneId = pm.whatsappPhoneId as string | undefined;

    if (!whatsappToken || !phoneId) {
      return NextResponse.json(
        { error: "WhatsApp credentials not configured" },
        { status: 400 }
      );
    }

    // Test the connection by fetching the phone number details
    const url = `https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${whatsappToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', data);
      return NextResponse.json(
        {
          error: data?.error?.message || "Failed to connect to WhatsApp API",
          details: data,
        },
        { status: response.status }
      );
    }

    // Success - return phone number details
    return NextResponse.json({
      success: true,
      message: "WhatsApp connection successful!",
      details: {
        phoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
        qualityRating: data.quality_rating,
      },
    });
  } catch (err: any) {
    console.error('WhatsApp test error:', err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
