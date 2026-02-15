import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import { AppBlockerGateBridge } from "@/components/app-blocker-gate-bridge";

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yggdrasil",
  description: "Video truth analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixelFont.variable} antialiased safe-area-shell`}>
        <AppBlockerGateBridge />
        {children}
      </body>
    </html>
  );
}
