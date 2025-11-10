"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Home, Building2, Users, Settings, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
  // Sidebar will not render a logo (single logo lives in navbar)

type Property = {
  id: string;
  title: string;
};

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [properties] = useState<Property[]>([]);
  const { t } = useI18n();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" data-tour-id="sidebar">
      <SidebarHeader>
        <div className="px-2 py-1.5" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => router.push("/")}
                  isActive={isActive("/")}
                  tooltip="Dashboard"
                >
                  <Home className="mr-2" />
                  <span>{t("navigation.dashboard")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => router.push("/properties")}
                  isActive={isActive("/properties")}
                  tooltip="Properties"
                >
                  <Building2 className="mr-2" />
                  <span>{t("navigation.properties")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => router.push("/schedule/manager")}
                  isActive={isActive("/schedule")}
                  tooltip="Schedule"
                >
                  <Calendar className="mr-2" />
                  <span>{t("navigation.schedule")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => router.push("/prospects")}
                  tooltip="Top Prospects"
                >
                  <Users className="mr-2" />
                  <span>{t("navigation.prospects")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
      </SidebarContent>

      <SidebarFooter>
        <Button
          variant="ghost"
          onClick={() => router.push("/settings")}
          className="w-full justify-center"
          aria-label={t("navigation.settings")}
          title={t("navigation.settings")}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
