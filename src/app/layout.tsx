import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
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
  description: "Regulatory intelligence workspace for Indian CA firms.",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const sessionCookie = (await cookies()).get("reg_mitra_session")?.value;
  const sessionMode = sessionCookie === "demo" ? "demo" : sessionCookie === "product" ? "product" : null;

  return (
    <html lang="en" className={`${jakarta.variable} ${newsreader.variable}`}>
      <body>
        <AppShell sessionMode={sessionMode}>{children}</AppShell>
      </body>
    </html>
  );
}
