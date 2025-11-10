"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
// We use simple buttons for the left nav to avoid Tabs indicator overlay
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { useI18n } from "@/lib/i18n/provider";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageCircle, ChevronDown, ChevronRight } from "lucide-react";
import ScreeningBuilder from "@/components/settings/ScreeningBuilder";

type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  image?: string | null;
};

const STORAGE_KEYS = {
  emailNotifs: "settings_email_notifications",
  desktopNotifs: "settings_desktop_notifications",
};

export default function SettingsPage() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(false);
  const [desktopNotifications, setDesktopNotifications] = useState<boolean>(false);
  const [tab, setTab] = useState<string>("general");
  // Integrations
  const [calendlyUrl, setCalendlyUrl] = useState<string>("");
  const [savingCalendly, setSavingCalendly] = useState(false);
  const [whatsappToken, setWhatsappToken] = useState<string>("");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState<string>("");
  const [whatsappConnectedAt, setWhatsappConnectedAt] = useState<string | null>(null);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [testWhatsAppResult, setTestWhatsAppResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [showCalendly, setShowCalendly] = useState<boolean>(false);
  const [showWhatsApp, setShowWhatsApp] = useState<boolean>(false);
  // Preferences
  const [timezone, setTimezone] = useState<string>(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [dateFormat, setDateFormat] = useState<"MDY" | "DMY" | "YMD">("DMY");
  const [currency, setCurrency] = useState<string>("SGD");
  const [defaultPage, setDefaultPage] = useState<string>("/");
  const [tableDensity, setTableDensity] = useState<"comfortable" | "compact">("comfortable");
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [developerMode, setDeveloperMode] = useState<boolean>(false);
  const [betaFeatures, setBetaFeatures] = useState<boolean>(false);
  const [soundNotifications, setSoundNotifications] = useState<boolean>(false);
  const [inAppToasts, setInAppToasts] = useState<boolean>(true);
  const [digestFrequency, setDigestFrequency] = useState<"off" | "daily" | "weekly">("off");
  const [savingPrefs, setSavingPrefs] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch("/api/user/profile", { credentials: "include" });
        if (res.ok) {
          const p = await res.json();
          setProfile(p);
          setName(p?.name ?? "");
          setWhatsappToken(p?.whatsappToken || "");
          setWhatsappPhoneId(p?.whatsappPhoneId || "");
          setWhatsappConnectedAt(p?.whatsappConnectedAt || null);
        }
      } catch (e) {
        console.warn("Failed to fetch profile", e);
      } finally {
        setLoading(false);
      }
    };
    const loadCalendly = async () => {
      try {
        const cRes = await fetch("/api/user/calendly", { credentials: "include" });
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData?.calendlyUrl) {
            setCalendlyUrl(cData.calendlyUrl);
            try { localStorage.setItem("calendly_url", cData.calendlyUrl); } catch {}
          } else {
            const saved = (typeof window !== "undefined" && localStorage.getItem("calendly_url")) || "";
            setCalendlyUrl(saved || "");
          }
        }
      } catch (e) {
        console.warn("Failed to load Calendly settings", e);
      }
    };
    const loadPreferences = async () => {
      try {
        const res = await fetch("/api/user/preferences", { credentials: "include" });
        if (res.ok) {
          const p = await res.json();
          setTimezone(p.timezone);
          setDateFormat(p.dateFormat);
          setCurrency(p.currency);
          setDefaultPage(p.defaultPage);
          setTableDensity(p.tableDensity);
          setReducedMotion(p.reducedMotion);
          setDeveloperMode(p.developerMode);
          setBetaFeatures(p.betaFeatures);
          setEmailNotifications(p.emailNotifications);
          setDesktopNotifications(p.desktopNotifications);
          setSoundNotifications(p.soundNotifications);
          setInAppToasts(p.inAppToasts);
          setDigestFrequency(p.digestFrequency);
        }
      } catch (e) {
        console.warn("Failed to load preferences", e);
      }
    };
    // load toggles
    try {
      const email = localStorage.getItem(STORAGE_KEYS.emailNotifs);
      const desktop = localStorage.getItem(STORAGE_KEYS.desktopNotifs);
      setEmailNotifications(email ? email === "true" : false);
      setDesktopNotifications(desktop ? desktop === "true" : false);
    } catch {}
    init();
    loadCalendly();
    loadPreferences();
  }, []);

  const initials = useMemo(() => {
    const n = name || profile?.name || "";
    return n
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s.charAt(0).toUpperCase())
      .join("");
  }, [name, profile?.name]);

  async function handleSaveProfile() {
    try {
      setSaving(true);
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save profile");
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function handleSaveNotifications(nextEmail: boolean, nextDesktop: boolean) {
    try {
      localStorage.setItem(STORAGE_KEYS.emailNotifs, String(nextEmail));
      localStorage.setItem(STORAGE_KEYS.desktopNotifs, String(nextDesktop));
      toast.success("Notification preferences saved");
    } catch {
      // ignore
    }
    // Persist in server preferences
    fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ emailNotifications: nextEmail, desktopNotifications: nextDesktop }),
    }).catch(() => {});
  }

  async function handleSaveCalendly() {
    try {
      setSavingCalendly(true);
      const res = await fetch("/api/user/calendly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ calendlyUrl: calendlyUrl.trim() }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to save Calendly URL");
      }
      try { localStorage.setItem("calendly_url", calendlyUrl.trim()); } catch {}
      toast.success("Calendly URL saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save Calendly URL");
    } finally {
      setSavingCalendly(false);
    }
  }

  async function handleSavePreferences() {
    try {
      setSavingPrefs(true);
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          timezone,
          dateFormat,
          currency,
          defaultPage,
          tableDensity,
          reducedMotion,
          developerMode,
          betaFeatures,
          soundNotifications,
          inAppToasts,
          digestFrequency,
        }),
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      toast.success("Preferences saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleExportData() {
    try {
      const res = await fetch("/api/user/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `account-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Data export downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
  }

  async function handleRevokeOtherSessions() {
    try {
      const res = await fetch("/api/user/sessions/revoke-others", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to revoke sessions");
      toast.success(`Revoked ${data.revoked} other sessions`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to revoke sessions");
    }
  }

  async function handleDeleteAccount() {
    const confirmText = typeof window !== "undefined" ? window.prompt("Type DELETE to permanently delete your account") : null;
    if (confirmText !== "DELETE") return;
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ confirm: true }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to delete account");
      toast.success("Account deleted. You will be signed out.");
      setTimeout(() => { window.location.href = "/sign-in"; }, 1200);
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete account");
    }
  }
  async function handleSaveWhatsApp() {
    try {
      setSavingWhatsApp(true);
      const res = await fetch("/api/user/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ whatsappToken: whatsappToken.trim(), whatsappPhoneId: whatsappPhoneId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save WhatsApp credentials");
      toast.success("WhatsApp credentials saved");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save WhatsApp credentials");
    } finally {
      setSavingWhatsApp(false);
    }
  }

  async function handleTestWhatsApp() {
    setTestingWhatsApp(true);
    setTestWhatsAppResult(null);
    try {
      const res = await fetch("/api/whatsapp/test", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Connection test failed");
      setTestWhatsAppResult({ success: true, message: data?.message, details: data?.details });
      toast.success("WhatsApp connection successful");
    } catch (e: any) {
      setTestWhatsAppResult({ success: false, message: e?.message || "Failed" });
      toast.error(e?.message || "Connection test failed");
    } finally {
      setTestingWhatsApp(false);
    }
  }

  return (
    <AppShell
      breadcrumbItems={[{ label: t("navigation.settings") }]}
      showAddButton={false}
      maxWidth="full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <div className="self-start lg:sticky lg:top-20">
          <div className="text-sm font-medium text-muted-foreground mb-2">Settings</div>
          <nav className="flex flex-col gap-1">
            {[
              { id: "general", label: "General" },
              { id: "account", label: "Account" },
              { id: "privacy", label: "Privacy" },
              { id: "notifications", label: "Notifications" },
              { id: "integrations", label: "Integrations" },
              { id: "screening", label: "Screening" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`text-left px-3 py-2 rounded-md transition-colors ${
                  tab === item.id ? "bg-muted font-medium" : "hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-6">
          {tab === "general" && (
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Language and app-wide preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="language">{t("settings.language")}</Label>
                  <Select value={locale} onValueChange={(v: any) => setLocale(v)}>
                    <SelectTrigger id="language">
                      <SelectValue placeholder={t("settings.selectLanguage")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{t("language.english")}</SelectItem>
                      <SelectItem value="zh">{t("language.mandarin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme">Appearance</Label>
                  <Select value={(theme as string) || "system"} onValueChange={(v: any) => setTheme(v)}>
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={(v: any) => setTimezone(v)}>
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"}>System ({Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"})</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                      <SelectItem value="Europe/London">Europe/London</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateformat">Date format</Label>
                  <Select value={dateFormat} onValueChange={(v: any) => setDateFormat(v)}>
                    <SelectTrigger id="dateformat">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MDY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="DMY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="YMD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SGD">SGD</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="MYR">MYR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultpage">Default page</Label>
                  <Select value={defaultPage} onValueChange={(v: any) => setDefaultPage(v)}>
                    <SelectTrigger id="defaultpage">
                      <SelectValue placeholder="Choose default page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="/">Dashboard</SelectItem>
                      <SelectItem value="/properties">Properties</SelectItem>
                      <SelectItem value="/prospects">Top Prospects</SelectItem>
                      <SelectItem value="/schedule">Schedule</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="density">Table density</Label>
                  <Select value={tableDensity} onValueChange={(v: any) => setTableDensity(v)}>
                    <SelectTrigger id="density">
                      <SelectValue placeholder="Choose density" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comfortable">Comfortable</SelectItem>
                      <SelectItem value="compact">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div>
                    <div className="font-medium">Reduce motion</div>
                    <div className="text-sm text-muted-foreground">Minimize animations across the app</div>
                  </div>
                  <Switch checked={reducedMotion} onCheckedChange={setReducedMotion} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={handleSavePreferences} disabled={savingPrefs}>{savingPrefs ? "Saving..." : "Save preferences"}</Button>
              </div>
            </CardContent>
          </Card>
          )}

          {tab === "account" && (
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Update your public profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar className="size-12">
                  {profile?.image ? (
                    <AvatarImage src={profile.image} alt={profile?.name ?? "User"} />
                  ) : null}
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="grid gap-2 w-full sm:max-w-sm">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={profile?.email ?? ""} readOnly />
                  </div>
                </div>
                <div className="ml-auto">
                  <Button onClick={handleSaveProfile} disabled={saving || loading}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          )}

          {tab === "privacy" && (
          <Card>
            <CardHeader>
              <CardTitle>Privacy</CardTitle>
              <CardDescription>Control what data is stored and shared</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Share anonymized usage</div>
                  <div className="text-sm text-muted-foreground">Help us improve the product by sharing anonymous metrics.</div>
                </div>
                {/* purely cosmetic for now */}
                <Switch defaultChecked={false} onCheckedChange={() => {}} />
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleExportData}>Download my data</Button>
                <Button variant="secondary" onClick={handleRevokeOtherSessions}>Sign out other sessions</Button>
                <Button variant="destructive" onClick={handleDeleteAccount}>Delete my account</Button>
              </div>
            </CardContent>
          </Card>
          )}

          {tab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Email notifications</div>
                  <div className="text-sm text-muted-foreground">Receive updates via email</div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={(v) => {
                    setEmailNotifications(v);
                    handleSaveNotifications(v, desktopNotifications);
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Desktop notifications</div>
                  <div className="text-sm text-muted-foreground">Show system notifications on updates</div>
                </div>
                <Switch
                  checked={desktopNotifications}
                  onCheckedChange={(v) => {
                    setDesktopNotifications(v);
                    handleSaveNotifications(emailNotifications, v);
                  }}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Sound</div>
                  <div className="text-sm text-muted-foreground">Play a sound for important events</div>
                </div>
                <Switch checked={soundNotifications} onCheckedChange={(v) => setSoundNotifications(v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">In-app toasts</div>
                  <div className="text-sm text-muted-foreground">Show toast messages inside the app</div>
                </div>
                <Switch checked={inAppToasts} onCheckedChange={(v) => setInAppToasts(v)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="digest">Email digest</Label>
                <Select value={digestFrequency} onValueChange={(v: any) => setDigestFrequency(v)}>
                  <SelectTrigger id="digest">
                    <SelectValue placeholder="Digest frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSavePreferences} disabled={savingPrefs}>{savingPrefs ? "Saving..." : "Save"}</Button>
              </div>
            </CardContent>
          </Card>
          )}

          {tab === "integrations" && (
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect your tools. Manage connections and test status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Calendly row */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">Calendly</div>
                      {calendlyUrl ? (
                        <Badge variant="secondary">Connected</Badge>
                      ) : (
                        <Badge variant="outline">Not connected</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">Scheduling link used for booking appointments.</div>
                    {calendlyUrl ? (
                      <div className="text-xs text-muted-foreground truncate">{calendlyUrl}</div>
                    ) : null}
                  </div>
                  <Button variant="ghost" onClick={() => setShowCalendly((s) => !s)} className="flex items-center gap-1">
                    {showCalendly ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    Manage
                  </Button>
                </div>
                {showCalendly && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="grid gap-2">
                      <Label htmlFor="calendly">Scheduling URL</Label>
                      <Input id="calendly" placeholder="https://calendly.com/your-handle" value={calendlyUrl} onChange={(e) => setCalendlyUrl(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveCalendly} disabled={savingCalendly}>{savingCalendly ? "Saving..." : "Save"}</Button>
                      {calendlyUrl ? (
                        <Button variant="secondary" asChild>
                          <a href={calendlyUrl} target="_blank" rel="noreferrer">Open</a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {/* Google Calendar row */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-primary"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5c0-1.1-.9-2-2-2Zm0 16H5V9h14v10ZM7 11h5v5H7v-5Z"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">Google Calendar</div>
                    <div className="text-sm text-muted-foreground truncate">Create events programmatically and detect conflicts.</div>
                  </div>
                  <Button variant="secondary" asChild>
                    <a href="/api/google/oauth/start">Connect</a>
                  </Button>
                </div>
              </div>

              {/* WhatsApp row */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary/10 p-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium">WhatsApp Business</div>
                      {whatsappToken && whatsappPhoneId ? (
                        <Badge variant="secondary">Connected</Badge>
                      ) : (
                        <Badge variant="outline">Not connected</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">Send and receive messages via the WhatsApp Business API.</div>
                    {whatsappConnectedAt ? (
                      <div className="text-xs text-muted-foreground">Connected {new Date(whatsappConnectedAt).toLocaleString()}</div>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleTestWhatsApp} disabled={testingWhatsApp}>{testingWhatsApp ? "Testing..." : "Test"}</Button>
                    <Button variant="ghost" onClick={() => setShowWhatsApp((s) => !s)} className="flex items-center gap-1">
                      {showWhatsApp ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      Manage
                    </Button>
                  </div>
                </div>
                {showWhatsApp && (
                  <div className="mt-4 space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="wa-token">Access Token</Label>
                      <Input id="wa-token" value={whatsappToken} onChange={(e) => setWhatsappToken(e.target.value)} placeholder="EAAG..." />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="wa-phone">Phone Number ID</Label>
                      <Input id="wa-phone" value={whatsappPhoneId} onChange={(e) => setWhatsappPhoneId(e.target.value)} placeholder="123456789012345" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={handleSaveWhatsApp} disabled={savingWhatsApp}>{savingWhatsApp ? "Saving..." : "Save"}</Button>
                      <Button variant="secondary" onClick={handleTestWhatsApp} disabled={testingWhatsApp}>{testingWhatsApp ? "Testing..." : "Test connection"}</Button>
                    </div>
                    {testWhatsAppResult ? (
                      <div className={`text-sm ${testWhatsAppResult.success ? "text-green-600" : "text-red-600"}`}>
                        {testWhatsAppResult.message}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {tab === "screening" && (
          <ScreeningBuilder />
          )}
        </div>
      </div>
    </AppShell>
  );
}


