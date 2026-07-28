export interface NavigationItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  section?: string;
}

export const navigation: readonly NavigationItem[] = [
  { label: "Home", href: "/", icon: "⌂", section: "Workspace" },
  { label: "Today", href: "/today", icon: "✓" },
  { label: "Clients", href: "/clients", icon: "◫", badge: "6" },
  { label: "Briefings", href: "/briefings", icon: "▤", badge: "6" },
  { label: "Calendar", href: "/calendar", icon: "□" },
  { label: "Regulations", href: "/regulations", icon: "≋", section: "Intelligence" },
  { label: "Ask Reg Mitra", href: "/assistant", icon: "✦" },
  { label: "Settings", href: "/settings", icon: "⚙", section: "System" },
] as const;
