import { NextResponse } from "next/server";

type TranslateRequest = {
  texts: string[];
  target: string; // e.g., 'zh'
  source?: string; // e.g., 'en'
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TranslateRequest;
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server missing GOOGLE_TRANSLATE_API_KEY" },
        { status: 500 }
      );
    }

    const { texts, target, source } = body || {};
    if (!Array.isArray(texts) || texts.length === 0 || typeof target !== "string") {
      return NextResponse.json(
        { error: "Invalid payload. Expect { texts: string[], target: string }" },
        { status: 400 }
      );
    }

    // Deduplicate and limit batch size
    const unique = Array.from(new Set(texts)).slice(0, 128);

    const params = new URLSearchParams();
    for (const t of unique) params.append("q", t);
    params.set("target", target);
    if (source) params.set("source", source);
    params.set("format", "text");

    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json(
        { error: `Translate upstream error: ${resp.status}`, details: errText },
        { status: 502 }
      );
    }

    const data = (await resp.json()) as any;
    const translations = (data?.data?.translations || []) as Array<{ translatedText: string; detectedSourceLanguage?: string }>;

    // Map back to original order
    const resultMap: Record<string, string> = {};
    unique.forEach((src, i) => {
      const tr = translations[i]?.translatedText ?? src;
      resultMap[src] = tr;
    });

    return NextResponse.json({ translations: resultMap });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}


