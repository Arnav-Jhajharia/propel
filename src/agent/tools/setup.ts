import {
  db,
  users,
  properties,
  screeningTemplates,
  userSettings,
} from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { googleAuthUrl } from "@/lib/google";

export type Checklist = {
  hasWhatsapp: boolean;
  hasGoogleCalendar: boolean;
  hasCalendlyUrl: boolean;
  hasProperty: boolean;
  hasQuestionnaire: boolean;
  hasPreferences: boolean;
};

export async function getSetupChecklist(userId: string): Promise<Checklist> {
  // Select only needed columns to avoid failures on older DBs missing new columns
  const [u] = await db
    .select({
      calendlyUrl: users.calendlyUrl,
      whatsappToken: users.whatsappToken,
      whatsappPhoneId: users.whatsappPhoneId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const hasWhatsapp = Boolean((u as any)?.whatsappPhoneId && (u as any)?.whatsappToken);
  const hasCalendlyUrl = Boolean((((u as any)?.calendlyUrl as string) || "").trim());
  const hasGoogleCalendar = false; // Determined via accounts provider=google; keep simple here

  const props = await db
    .select({ id: properties.id })
    .from(properties)
    .where(eq(properties.userId, userId))
    .limit(1);
  const hasProperty = props.length > 0;

  const tmpl = await db
    .select({ id: screeningTemplates.id })
    .from(screeningTemplates)
    .where(and(eq(screeningTemplates.userId, userId)))
    .limit(1);
  const hasQuestionnaire = tmpl.length > 0;

  const prefs = await db
    .select({ id: userSettings.id })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);
  const hasPreferences = prefs.length > 0;

  return {
    hasWhatsapp,
    hasGoogleCalendar,
    hasCalendlyUrl,
    hasProperty,
    hasQuestionnaire,
    hasPreferences,
  };
}

export async function saveCalendlyUrl(userId: string, url: string): Promise<void> {
  await db.update(users).set({ calendlyUrl: url.trim() }).where(eq(users.id, userId));
}

export function getGoogleOAuthLink(request?: Request): string {
  return googleAuthUrl(request);
}

export type QuestionnaireField = { id: string; label: string; type: string; required?: boolean };

export async function saveQuestionnaire(userId: string, fields: QuestionnaireField[]): Promise<void> {
  const name = "Default Intake";
  const existing = await db
    .select()
    .from(screeningTemplates)
    .where(and(eq(screeningTemplates.userId, userId)))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(screeningTemplates)
      .set({ name, fields: JSON.stringify(fields), isDefault: true })
      .where(eq(screeningTemplates.id, existing[0].id));
  } else {
    await db.insert(screeningTemplates).values({ userId, name, fields: JSON.stringify(fields), isDefault: true });
  }
}

export async function ensureDefaultPreferences(userId: string): Promise<void> {
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  if (rows.length === 0) {
    await db.insert(userSettings).values({ userId });
  }
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  try {
    await db.update(users).set({ onboardingCompletedAt: new Date().toISOString() }).where(eq(users.id, userId));
  } catch {
    // Column may not exist yet if migrations haven't been applied; ignore
  }
}


