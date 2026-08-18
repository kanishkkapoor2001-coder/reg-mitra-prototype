import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
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
    default: "Reg Mitra | Regulatory research for Indian CA firms",
    template: "%s | Reg Mitra",
  },
  description: "Review official regulatory sources, check which clients may be affected, and prepare review-ready client work in one workspace for Indian CA firms.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${newsreader.variable}`} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme before first paint. Without this a dark-mode
            user gets a white flash on every load, which is the one thing a
            theme preference exists to prevent. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("reg-mitra-theme");if(t==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
