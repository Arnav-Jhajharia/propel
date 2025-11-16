export type Locale = "en" | "zh";

export const dictionaries: Record<Locale, Record<string, any>> = {
  en: {
    navigation: {
      dashboard: "Dashboard",
      properties: "Properties",
      prospects: "Top Prospects",
      schedule: "Schedule",
      settings: "Settings",
    },
    navbar: {
      searchOrJump: "Search or jump...",
      openCommandMenu: "Open command menu",
    },
    settings: {
      language: "Language",
      selectLanguage: "Select your language",
    },
    language: {
      english: "English",
      mandarin: "Mandarin (中文)",
    },
  },
  zh: {
    navigation: {
      dashboard: "仪表板",
      properties: "房源",
      prospects: "潜在客户",
      schedule: "日程",
      settings: "设置",
    },
    navbar: {
      searchOrJump: "搜索或跳转…",
      openCommandMenu: "打开命令菜单",
    },
    settings: {
      language: "语言",
      selectLanguage: "选择你的语言",
    },
    language: {
      english: "英语",
      mandarin: "中文",
    },
  },
};

export function getFromDictionary(dict: Record<string, any>, keyPath: string): string | undefined {
  const parts = keyPath.split(".");
  let node: any = dict;
  for (const part of parts) {
    if (node && typeof node === "object" && part in node) {
      node = (node as Record<string, any>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === "string" ? node : undefined;
}


