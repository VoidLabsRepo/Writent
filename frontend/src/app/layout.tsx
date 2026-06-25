import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Writent — The Most Humanly AI Writer",
  description: "Multi-agent AI article writer that sounds human, not generated",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body className="min-h-screen bg-surface-950">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
