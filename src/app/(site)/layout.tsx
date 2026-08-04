import type { ReactNode } from "react";

// The website. Each page brings its own <PublicShell>, so this group layout
// is a simple pass-through — it exists only to keep site pages out of the
// product's AppShell. Edit website pages under (site)/ only.
export default function SiteGroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
