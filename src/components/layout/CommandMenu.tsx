"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Home,
  Building2,
  MessageCircle,
  Settings,
  Plug,
  Calendar,
  Users,
  UserPlus,
  Upload,
} from "lucide-react";

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter();

  const go = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [onOpenChange, router]
  );

  const handleAction = useCallback(
    (action: string) => {
      onOpenChange(false);
      switch (action) {
        case "import-property":
          router.push("/properties");
          break;
        case "connect-whatsapp":
          router.push("/integrations");
          break;
        default:
          break;
      }
    },
    [router, onOpenChange]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Quick search</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search pages and actions..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            
            <CommandGroup heading="Pages">
              <CommandItem onSelect={() => go("/")}>
                <Home className="mr-2 h-4 w-4" /> Dashboard
              </CommandItem>
              <CommandItem onSelect={() => go("/properties")}>
                <Building2 className="mr-2 h-4 w-4" /> Properties
              </CommandItem>
              <CommandItem onSelect={() => go("/clients")}>
                <Users className="mr-2 h-4 w-4" /> Clients
              </CommandItem>
              <CommandItem onSelect={() => go("/prospects")}>
                <UserPlus className="mr-2 h-4 w-4" /> Prospects
              </CommandItem>
              <CommandItem onSelect={() => go("/schedule/manager")}>
                <Calendar className="mr-2 h-4 w-4" /> Schedule
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              <CommandItem onSelect={() => handleAction("import-property")}>
                <Upload className="mr-2 h-4 w-4" /> Import Property
              </CommandItem>
              <CommandItem onSelect={() => handleAction("connect-whatsapp")}>
                <MessageCircle className="mr-2 h-4 w-4" /> Connect WhatsApp
              </CommandItem>
              <CommandItem onSelect={() => go("/integrations")}>
                <Plug className="mr-2 h-4 w-4" /> Integrations
              </CommandItem>
              <CommandItem onSelect={() => go("/settings")}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default CommandMenu;


