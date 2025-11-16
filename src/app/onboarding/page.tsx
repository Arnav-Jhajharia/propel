"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, MessageCircle } from "lucide-react";
import SetupAssistantPanel from "@/components/chat/SetupAssistantPanel";

export default function OnboardingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    // Load Facebook SDK (same logic as integrations)
    if (!document.getElementById('facebook-jssdk')) {
      (window as any).fbAsyncInit = function () {
        (window as any).FB.init({
          appId: process.env.NEXT_PUBLIC_META_APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v21.0',
        });
      };

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    }
  }, []);

  const initiateEmbeddedSignup = () => {
    const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
    const configId = 2105158440016216;
    const redirectUri = process.env.NEXT_PUBLIC_META_OAUTH_REDIRECT_URI || `${window.location.origin}/api/whatsapp/oauth/callback`;

    if (!metaAppId || !configId) {
      setStatus("WhatsApp Embedded Signup is not configured. Please contact your administrator.");
      return;
    }

    if (!(window as any).FB) {
      setStatus("Facebook SDK is still loading. Please wait a moment and try again.");
      return;
    }

    const FB = (window as any).FB;

    const fbLoginCallback = (response: any) => {
      if (response.authResponse) {
        const code = response.authResponse.code;
        window.location.href = `${redirectUri}?code=${code}`;
      } else {
        setStatus("WhatsApp connection was cancelled or failed.");
      }
    };

    const loginOptions = {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: 'whatsapp_business_app_onboarding',
        sessionInfoVersion: '3'
      }
    } as const;

    FB.login(fbLoginCallback, loginOptions as any);
  };

  const skipForNow = async () => {
    try {
      const res = await fetch('/api/onboarding/skip', { method: 'POST', body: JSON.stringify({ hours: 24 }) });
      if (res.ok) {
        router.push('/');
      } else {
        setStatus('Failed to skip for now. Please try again.');
      }
    } catch {
      setStatus('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Connect WhatsApp Business
            </CardTitle>
            <CardDescription>
              Finish setup by connecting your WhatsApp Business account. This enables automated prospect screening and messaging.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={initiateEmbeddedSignup} size="lg" className="w-full sm:w-auto">
              <MessageCircle className="h-4 w-4 mr-2" />
              Connect WhatsApp Business
            </Button>
            {status && (
              <div className="text-sm text-red-600">{status}</div>
            )}
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-600" />
              <p>You can also connect later from Settings → Integrations, but we highly recommend doing it now.</p>
            </div>
            <div className="pt-2">
              <Button variant="ghost" onClick={skipForNow}>
                I’ll do this later
              </Button>
            </div>
          </CardContent>
        </Card>
        <SetupAssistantPanel />
      </div>
    </div>
  );
}


