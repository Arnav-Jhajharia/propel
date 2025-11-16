import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_OAUTH_REDIRECT_URI = process.env.META_OAUTH_REDIRECT_URI;

/**
 * Get the base URL for redirects, handling ngrok/proxied requests
 */
function getBaseUrl(req: Request): string {
  // Try to get the original URL from headers (ngrok, load balancers, proxies)
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host');
  const host = req.headers.get('host');

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (forwardedHost) {
    return `https://${forwardedHost}`;
  }

  if (host) {
    // If it's localhost, use http, otherwise use https
    const protocol = host.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }

  // Fallback to req.url origin
  const url = new URL(req.url);
  return url.origin;
}

export async function GET(req: Request) {
  const baseUrl = getBaseUrl(req);
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      console.error("OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/integrations?error=${encodeURIComponent(errorDescription || error)}`,
          baseUrl
        )
      );
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        new URL(
          `/integrations?error=${encodeURIComponent("No authorization code received")}`,
          baseUrl
        )
      );
    }

    const { userId } = auth();
    if (!userId) {
      return NextResponse.redirect(new URL(`/sign-in`, baseUrl));
    }

    // Exchange authorization code for access token
    const tokenExchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token`;
    const tokenParams = new URLSearchParams({
      client_id: META_APP_ID!,
      client_secret: META_APP_SECRET!,
      code: code,
      redirect_uri: META_OAUTH_REDIRECT_URI!,
    });

    const tokenResponse = await fetch(`${tokenExchangeUrl}?${tokenParams.toString()}`, {
      method: "GET",
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL(
          `/integrations?error=${encodeURIComponent(errorData.error?.message || "Failed to exchange authorization code")}`,
          baseUrl
        )
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL(
          `/integrations?error=${encodeURIComponent("No access token received")}`,
          baseUrl
        )
      );
    }

    // Get WhatsApp Business Account details
    const debugTokenUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`;
    const debugResponse = await fetch(debugTokenUrl);
    const debugData = await debugResponse.json();

    // Get WABA ID from granular scopes or data
    let wabaId = debugData?.data?.granular_scopes?.find(
      (scope: any) => scope.scope === "whatsapp_business_management"
    )?.target_ids?.[0];

    // If not in debug token, try to get from accounts endpoint
    if (!wabaId) {
      const accountsUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`;
      const accountsResponse = await fetch(accountsUrl);
      const accountsData = await accountsResponse.json();

      // Try to get WABA from first account
      if (accountsData.data && accountsData.data.length > 0) {
        const pageId = accountsData.data[0].id;
        const wabaUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=whatsapp_business_account&access_token=${accessToken}`;
        const wabaResponse = await fetch(wabaUrl);
        const wabaData = await wabaResponse.json();
        wabaId = wabaData.whatsapp_business_account?.id;
      }
    }

    // Get phone number ID from WABA
    let phoneNumberId = null;
    if (wabaId) {
      const phoneNumbersUrl = `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`;
      const phoneNumbersResponse = await fetch(phoneNumbersUrl);
      const phoneNumbersData = await phoneNumbersResponse.json();

      if (phoneNumbersData.data && phoneNumbersData.data.length > 0) {
        phoneNumberId = phoneNumbersData.data[0].id;
      }
    }

    if (!phoneNumberId) {
      return NextResponse.redirect(
        new URL(
          `/integrations?error=${encodeURIComponent("No WhatsApp phone number found. Please add a phone number to your WhatsApp Business Account.")}`,
          baseUrl
        )
      );
    }

    // Store in Clerk private metadata
    await clerkClient.users.updateUser(userId, {
      privateMetadata: {
        whatsappToken: accessToken,
        whatsappPhoneId: phoneNumberId,
        wabaId: wabaId ?? null,
        whatsappConnectedAt: new Date().toISOString(),
      },
    });

    // Redirect back to integrations page with success message
    return NextResponse.redirect(
      new URL(`/onboarding?success=connected`, baseUrl)
    );
  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/integrations?error=${encodeURIComponent(error.message || "An unexpected error occurred")}`,
        baseUrl
      )
    );
  }
}
