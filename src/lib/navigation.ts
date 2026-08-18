export interface NavigationItem {
  label: string;
  href: string;
  icon: "home" | "today" | "clients" | "assistant";
  badge?: string;
}

export const navigation: readonly NavigationItem[] = [
  { label: "Home", href: "/home", icon: "home" },
  { label: "Today", href: "/today", icon: "today" },
  { label: "Clients", href: "/clients", icon: "clients" },
  { label: "Assistant", href: "/assistant", icon: "assistant" },
] as const;
