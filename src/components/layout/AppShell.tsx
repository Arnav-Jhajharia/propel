"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppNavbar } from "./AppNavbar";
import SimpleAuthWrapper from "@/components/SimpleAuthWrapper";

interface AppShellProps {
  children: ReactNode;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
  showAddButton?: boolean;
  maxWidth?: "none" | "5xl" | "6xl" | "7xl" | "full";
}

export function AppShell({
  children,
  breadcrumbItems,
  showAddButton = true,
  maxWidth = "full",
}: AppShellProps) {
  const maxWidthClass = {
    none: "",
    "5xl": "max-w-5xl mx-auto",
    "6xl": "max-w-6xl mx-auto",
    "7xl": "max-w-7xl mx-auto",
    full: "w-full",
  }[maxWidth];

  return (
    <SimpleAuthWrapper>
      <SidebarProvider open={false} onOpenChange={() => {}}>
        <AppSidebar />
        <SidebarInset>
          <AppNavbar breadcrumbItems={breadcrumbItems} showAddButton={showAddButton} />
          <div className={`p-6 ${maxWidthClass}`}>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SimpleAuthWrapper>
  );
}
