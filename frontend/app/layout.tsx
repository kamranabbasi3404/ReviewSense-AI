import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "src/components/Navbar";
import CookieConsent from "src/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReviewSense AI - Intelligent Product Review Analytics",
  description: "Upload customer reviews CSV, run local fine-tuned BERT sentiment analysis, and generate interactive analytics and Groq LLM insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <CookieConsent />
      </body>
    </html>
  );
}
