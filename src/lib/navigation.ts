export interface NavigationItem {
  label: string;
  href: string;
  icon: "today" | "clients" | "assistant";
  badge?: string;
}

export const navigation: readonly NavigationItem[] = [
  { label: "Today", href: "/today", icon: "today" },
  { label: "Clients", href: "/clients", icon: "clients" },
  { label: "Assistant", href: "/assistant", icon: "assistant" },
] as const;
