import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";
import "./globals.css";
import { CapacitorInit } from "@/components/capacitor-init";

const pixelFont = Silkscreen({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mind Bloom",
  description: "Grow your mind, one bloom at a time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixelFont.variable} antialiased`}>
        <CapacitorInit />
        {children}
      </body>
    </html>
  );
}
