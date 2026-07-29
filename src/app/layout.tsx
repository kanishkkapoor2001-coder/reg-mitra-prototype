import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import "./tokens.css";
import "./globals.css";
import "./marketing.css";
import "./calendar.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Reg Mitra",
    template: "%s · Reg Mitra",
  },
  description: "Reg Mitra monitors official regulatory updates, maps them to affected clients, and prepares the next action for Indian CA firms.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const sessionCookie = (await cookies()).get("reg_mitra_session")?.value;
  let sessionMode: "demo" | "product" | null = sessionCookie === "demo" ? "demo" : null;

  if (!sessionMode && getSupabasePublicConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) sessionMode = "product";
  }

  return (
    <html lang="en" className={`${jakarta.variable} ${newsreader.variable}`}>
      <body>
        <AppShell sessionMode={sessionMode}>{children}</AppShell>
      </body>
    </html>
  );
}
