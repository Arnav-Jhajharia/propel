"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, ExternalLink, Calendar, MessageCircle, Building2, Settings, Loader2 } from "lucide-react";
import PropertyGuruImport from "@/components/PropertyGuruImport";
import { AppShell } from "@/components/layout/AppShell";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/provider";

export default function IntegrationsPage() {
  const { locale, setLocale, t } = useI18n();
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [whatsappToken, setWhatsappToken] = useState("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState("");
  const [whatsappConnectedAt, setWhatsappConnectedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [setupMethod, setSetupMethod] = useState<"embedded" | "manual">("embedded");

  useEffect(() => {
    // Load user data
    const loadUserData = async () => {
      try {
        const savedCalendly = localStorage.getItem("calendly_url") || "";
        setCalendlyUrl(savedCalendly);

        // Load calendly from server if present
        try {
          const cRes = await fetch("/api/user/calendly", { credentials: "include" });
          if (cRes.ok) {
            const cData = await cRes.json();
            if (cData?.calendlyUrl) {
              setCalendlyUrl(cData.calendlyUrl);
              localStorage.setItem("calendly_url", cData.calendlyUrl);
            }
          }
        } catch (e) {
          console.warn("Failed to load Calendly settings:", e);
        }

        const response = await fetch("/api/user/profile", {
          credentials: "include",
        });

        if (response.ok) {
          const userData = await response.json();
          setWhatsappToken(userData.whatsappToken || "");
          setWhatsappPhoneId(userData.whatsappPhoneId || "");
          setWhatsappConnectedAt(userData.whatsappConnectedAt || null);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const error = urlParams.get('error');
        const initiated = typeof window !== 'undefined' && sessionStorage.getItem('calendly_connecting') === '1';

        if (success && initiated) {
          setStatus(success);
          const refreshResponse = await fetch("/api/user/profile", { credentials: "include" });
          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json();
            setWhatsappToken(refreshedData.whatsappToken || "");
            setWhatsappPhoneId(refreshedData.whatsappPhoneId || "");
            setWhatsappConnectedAt(refreshedData.whatsappConnectedAt || null);
          }
          setTimeout(() => setStatus(null), 3500);
          window.history.replaceState({}, '', '/integrations');
        } else if (error && initiated) {
          setStatus(error);
          setTimeout(() => setStatus(null), 3500);
          window.history.replaceState({}, '', '/integrations');
        } else if (success || error) {
          // Clear stray params without surfacing a banner
          window.history.replaceState({}, '', '/integrations');
        }

        if (initiated) {
          sessionStorage.removeItem('calendly_connecting');
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };

    // Load Facebook SDK
    if (!document.getElementById('facebook-jssdk')) {
      console.log('[SDK] Loading Facebook SDK...');

      (window as any).fbAsyncInit = function () {
        (window as any).FB.init({
          appId: process.env.NEXT_PUBLIC_META_APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v21.0',
        });
        console.log('[SDK] ✅ Facebook SDK initialized');
      };

      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        console.log('[SDK] SDK script loaded');
      };

      script.onerror = () => {
        console.error('[SDK] ❌ Failed to load Facebook SDK');
      };

      document.body.appendChild(script);
    }

    loadUserData();
  }, []);

  const calendlyValid = useMemo(() => {
    return /^https?:\/\/(?:www\.)?calendly\.com\/.+/.test(calendlyUrl);
  }, [calendlyUrl]);

  const whatsappValid = useMemo(() => {
    return whatsappToken.length > 0 && whatsappPhoneId.length > 0;
  }, [whatsappToken, whatsappPhoneId]);

  const saveCalendly = () => {
    if (!calendlyValid) {
      setStatus("Enter a valid Calendly link, e.g. https://calendly.com/yourname/30min");
      return;
    }
    const url = calendlyUrl.trim();
    localStorage.setItem("calendly_url", url);
    fetch("/api/user/calendly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ calendlyUrl: url })
    }).then(r => {
      if (!r.ok) throw new Error("Save failed");
      setStatus("Calendly connected successfully!");
      setTimeout(() => setStatus(null), 3000);
    }).catch(() => {
      setStatus("Saved locally. Sign in to save to your account.");
      setTimeout(() => setStatus(null), 4000);
    });
  };

  const saveWhatsApp = async () => {
    if (!whatsappValid) {
      setStatus("Please enter both WhatsApp Token and Phone Number ID");
      return;
    }

    try {
      const response = await fetch("/api/user/whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          whatsappToken: whatsappToken.trim(),
          whatsappPhoneId: whatsappPhoneId.trim(),
        }),
      });

      if (response.ok) {
        setStatus("WhatsApp Business API configured successfully!");
        setTimeout(() => setStatus(null), 3000);
      } else {
        const error = await response.json();
        setStatus(error.error || "Failed to save WhatsApp credentials");
      }
    } catch (error) {
      setStatus("Network error. Please try again.");
    }
  };

  const testWhatsApp = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/whatsapp/test", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: data.message,
          details: data.details,
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "Connection test failed",
          details: data.details,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: "Network error. Please check your connection.",
      });
    } finally {
      setTesting(false);
    }
  };

  const initiateEmbeddedSignup = () => {
    console.log('[BUTTON] Connect WhatsApp Business clicked');

    const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
    const configId = 2105158440016216;
    const redirectUri = process.env.NEXT_PUBLIC_META_OAUTH_REDIRECT_URI || `${window.location.origin}/api/whatsapp/oauth/callback`;

    console.log('[BUTTON] App ID:', metaAppId);
    console.log('[BUTTON] Config ID:', configId);
    console.log('[BUTTON] Redirect URI:', redirectUri);

    if (!metaAppId || !configId) {
      console.error('[BUTTON] Missing configuration!');
      setStatus("WhatsApp Embedded Signup is not configured. Please contact your administrator.");
      return;
    }

    // Check if Facebook SDK is loaded
    console.log('[BUTTON] Checking if FB SDK is loaded...');
    console.log('[BUTTON] window.FB exists?', !!(window as any).FB);

    if (!(window as any).FB) {
      console.error('[BUTTON] FB SDK not loaded yet');
      setStatus("Facebook SDK is still loading. Please wait a moment and try again.");
      return;
    }

    const FB = (window as any).FB;
    console.log('[BUTTON] ✅ FB SDK is loaded, calling FB.login...');

    // Response callback - handles the exchangeable token code
    const fbLoginCallback = (response: any) => {
      console.log('[CALLBACK] FB.login response:', response);

      if (response.authResponse) {
        const code = response.authResponse.code;
        console.log('[CALLBACK] ✅ Got exchangeable token code:', code);

        // Redirect to our OAuth callback with the code
        window.location.href = `${redirectUri}?code=${code}`;
      } else {
        console.log('[CALLBACK] ❌ Login failed or cancelled:', response);
        setStatus("WhatsApp connection was cancelled or failed.");
      }
    };

    // Launch Embedded Signup with Coexistence mode
    // The extras.featureType enables WhatsApp Business App onboarding (Coexistence)
    const loginOptions = {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        setup: {},
        featureType: 'whatsapp_business_app_onboarding', // This enables Coexistence!
        sessionInfoVersion: '3'
      }
    };

    console.log('[BUTTON] FB.login options:', loginOptions);
    FB.login(fbLoginCallback, loginOptions);
    console.log('[BUTTON] FB.login called');
  };

  const breadcrumbs = [{ label: "Integrations" }];

  return (
    <AppShell breadcrumbItems={breadcrumbs} maxWidth="6xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Connect your PropertyGuru listings, WhatsApp, and scheduling tools.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("settings.language")}</CardTitle>
            <CardDescription>{t("settings.selectLanguage")}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Select value={locale} onValueChange={(val) => setLocale(val as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("language.english")}</SelectItem>
                <SelectItem value="zh">{t("language.mandarin")}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {!whatsappValid && (
          <div className="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="h-5 w-5 text-yellow-700 dark:text-yellow-300 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">Action required: Connect WhatsApp Business</h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">Enable automated messaging and prospect workflows by connecting your WhatsApp Business account.</p>
                <Button onClick={initiateEmbeddedSignup} size="sm">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Connect Now
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs defaultValue="properties" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="properties" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="messaging" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Messaging
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduling
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-6 mt-6">
            <PropertyGuruImport onPropertyImported={() => {
              setStatus("Property imported successfully! Check your dashboard.");
              setTimeout(() => setStatus(null), 3000);
            }} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  PropertyGuru Integration
                </CardTitle>
                <CardDescription>
                  Import properties directly from PropertyGuru with advanced search and filtering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Single Property Import</h4>
                    <p className="text-sm text-muted-foreground">
                      Paste any PropertyGuru listing URL to import individual properties
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium">Bulk Search Import</h4>
                    <p className="text-sm text-muted-foreground">
                      Search and import multiple properties based on your criteria
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messaging" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp Business API
                </CardTitle>
                <CardDescription>
                  Configure WhatsApp Business API for automated prospect screening and messaging
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Setup Method Tabs */}
                <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
                  <button
                    onClick={() => setSetupMethod("embedded")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      setupMethod === "embedded"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Quick Setup
                  </button>
                  <button
                    onClick={() => setSetupMethod("manual")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      setupMethod === "manual"
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Manual Setup
                  </button>
                </div>

                {/* Embedded Signup Method */}
                {setupMethod === "embedded" && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Recommended: One-Click Setup
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                        Connect your WhatsApp Business account in seconds. No need to copy tokens or navigate Meta dashboards.
                      </p>
                    <Button onClick={initiateEmbeddedSignup} size="lg" className="w-full sm:w-auto">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Connect WhatsApp Business
                      </Button>
                    </div>

                    {whatsappValid && whatsappConnectedAt && (
                      <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                              WhatsApp Connected
                            </h4>
                            <p className="text-sm text-green-700 dark:text-green-300">
                              Connected on {new Date(whatsappConnectedAt).toLocaleDateString()} at{" "}
                              {new Date(whatsappConnectedAt).toLocaleTimeString()}
                            </p>
                            <Button
                              onClick={testWhatsApp}
                              variant="outline"
                              size="sm"
                              className="mt-3"
                              disabled={testing}
                            >
                              {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Test Connection
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Setup Method */}
                {setupMethod === "manual" && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertDescription>
                        For advanced users. Get credentials from the{" "}
                        <a
                          href="https://developers.facebook.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-medium"
                        >
                          Meta Developer Console
                        </a>
                      </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-token">WhatsApp Access Token</Label>
                    <Input
                      id="whatsapp-token"
                      type="password"
                      placeholder="Enter your WhatsApp Business API token"
                      value={whatsappToken}
                      onChange={(e) => setWhatsappToken(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-phone">Phone Number ID</Label>
                    <Input
                      id="whatsapp-phone"
                      placeholder="Enter your WhatsApp Phone Number ID"
                      value={whatsappPhoneId}
                      onChange={(e) => setWhatsappPhoneId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={saveWhatsApp} variant={whatsappValid ? "default" : "secondary"}>
                    Save Configuration
                  </Button>
                  <Button
                    onClick={testWhatsApp}
                    variant="outline"
                    disabled={testing || !whatsappValid}
                  >
                    {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Test Connection
                  </Button>
                  {whatsappValid ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not configured</Badge>
                  )}
                </div>

                    {testResult && (
                      <Alert variant={testResult.success ? "default" : "destructive"}>
                        <AlertDescription>
                          <div className="font-medium">{testResult.message}</div>
                          {testResult.details && (
                            <div className="mt-2 text-sm space-y-1">
                              {testResult.details.phoneNumber && (
                                <div>Phone: {testResult.details.phoneNumber}</div>
                              )}
                              {testResult.details.verifiedName && (
                                <div>Name: {testResult.details.verifiedName}</div>
                              )}
                              {testResult.details.qualityRating && (
                                <div>Quality: {testResult.details.qualityRating}</div>
                              )}
                            </div>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendly Integration
                </CardTitle>
                <CardDescription>
                  Connect your Calendly account for one-click appointment scheduling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      try { sessionStorage.setItem('calendly_connecting', '1'); } catch {}
                      window.location.href = '/api/calendly/oauth/start';
                    }}
                  >
                    Connect with Calendly
                  </Button>
                  {calendlyValid ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calendly-url">Calendly URL</Label>
                  <Input
                    id="calendly-url"
                    placeholder="https://calendly.com/your-name/30min"
                    value={calendlyUrl}
                    onChange={(e) => setCalendlyUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your public Calendly scheduling link
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={saveCalendly} variant={calendlyValid ? "default" : "secondary"}>
                    Save Calendly Link
                  </Button>
                </div>
                {calendlyValid && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Calendly Preview</h4>
                    <iframe
                      title="Calendly Preview"
                      className="w-full h-[500px] border rounded-md"
                      src={`https://calendly.com/${calendlyUrl.replace(/^https?:\/\/(?:www\.)?calendly\.com\//, "")}`}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {status && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}
      </div>
    </AppShell>
  );
}