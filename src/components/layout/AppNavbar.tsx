"use client";

import { Breadcrumbs } from "./Breadcrumbs";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import logo from "../../../image.png";
import CommandMenu from "./CommandMenu";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";

interface AppNavbarProps {
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  showAddButton?: boolean;
}

export function AppNavbar({ breadcrumbItems, showAddButton = true }: AppNavbarProps) {
  const router = useRouter();
  const [cmdOpen, setCmdOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div data-tour-id="navbar" className="flex h-16 items-center gap-4 border-b px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex-1 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80">
          <Image src={logo} alt="Logo" width={48} height={48} className="h-12 w-12 object-contain" />
          <span className="text-lg font-semibold tracking-tight">Propel</span>
        </Link>
        <div className="hidden md:block">
          <Breadcrumbs customItems={breadcrumbItems} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setCmdOpen(true)}
          className="hidden sm:flex items-center gap-2 text-sm rounded-md border px-4 py-2 text-muted-foreground hover:bg-muted"
          aria-label={t("navbar.openCommandMenu")}
        >
          {t("navbar.searchOrJump")}
          <kbd className="ml-2 text-[11px] text-muted-foreground/80">⌘K</kbd>
        </button>
        <UserMenu />
      </div>
      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}
