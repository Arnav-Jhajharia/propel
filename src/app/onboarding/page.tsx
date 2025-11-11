"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  ArrowLeft,
  Loader2
} from "lucide-react";
import SetupAssistantPanel from "@/components/chat/SetupAssistantPanel";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [status, setStatus] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Load Facebook SDK
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
      setStatus("WhatsApp connection isn't available right now. You can set it up later from Settings.");
      return;
    }

    if (!(window as any).FB) {
      setStatus("Please wait a moment and try again.");
      return;
    }

    setIsConnecting(true);
    setStatus(null);

    const FB = (window as any).FB;

    const fbLoginCallback = (response: any) => {
      setIsConnecting(false);
      if (response.authResponse) {
        const code = response.authResponse.code;
        window.location.href = `${redirectUri}?code=${code}`;
      } else {
        setStatus("Connection cancelled. You can connect WhatsApp later from Settings.");
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
        setStatus('Something went wrong. Please try again.');
      }
    } catch {
      setStatus('Network error. Please try again.');
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAddProperty = () => {
    router.push('/properties');
  };

  const handleComplete = () => {
    setIsComplete(true);
    setTimeout(() => {
      router.push('/');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-sm text-muted-foreground">
          Step {currentStep} of 4
        </div>

        <div className="space-y-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold mb-3">
                  Get started
                </h1>
                <p className="text-muted-foreground">
                  Add your first property and connect WhatsApp to start managing rentals.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={nextStep}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold mb-3">
                  Add your first property
                </h1>
                <p className="text-muted-foreground">
                  Add a property listing to start tracking inquiries and managing tenants.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleAddProperty}>
                  Add property
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={nextStep}>
                  Skip
                </Button>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={prevStep} size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold mb-3">
                  Connect WhatsApp
                </h1>
                <p className="text-muted-foreground">
                  Connect your WhatsApp Business account to respond to inquiries and manage conversations.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={initiateEmbeddedSignup}
                  disabled={isConnecting}
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Connect WhatsApp
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={skipForNow}>
                  Skip
                </Button>
              </div>

              {status && (
                <div className="text-sm text-destructive">
                  {status}
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="ghost" onClick={prevStep} size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-semibold mb-3">
                  Setup complete
                </h1>
                <p className="text-muted-foreground">
                  You can start managing your properties now. Add more properties or connect WhatsApp anytime from Settings.
                </p>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleComplete} disabled={isComplete}>
                  {isComplete ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      Go to dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={prevStep} size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12">
          <SetupAssistantPanel />
        </div>
      </div>
    </div>
  );
}
