"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Home, Building2, Users, Settings, MessageSquare, Bot } from "lucide-react";

export function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  const menuItems = [
    { icon: Home, label: "Dashboard", path: "/" },
    { icon: MessageSquare, label: "Unified Chat", path: "/chat" },
    { icon: Users, label: "Clients", path: "/clients" },
    { icon: Building2, label: "Properties", path: "/properties" },
    { icon: Bot, label: "Automation", path: "/bot-settings" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r">
      {/* Header */}
      <SidebarHeader className="p-4 pb-3">
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="w-6 h-6 rounded border-2 border-foreground/80" />
          <span className="text-lg font-medium">Propel</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        {/* Menu Items */}
        <div className="space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${active 
                    ? 'bg-accent text-foreground' 
                    : 'text-foreground/80 hover:bg-accent/50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 border-t">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-foreground text-background text-sm font-medium">
              A
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Agent</div>
            <div className="text-xs text-muted-foreground">Free plan</div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
