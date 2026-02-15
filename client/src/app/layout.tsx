import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";
import "./globals.css";
import { AppBlockerGateBridge } from "@/components/app-blocker-gate-bridge";
import { AuthProvider } from "@/components/AuthProvider";
import NavbarWrapper from "@/components/NavbarWrapper";

const pixelFont = Silkscreen({
  variable: "--font-pixel",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MindBloom",
  description: "Grow your mind, shrink misinformation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixelFont.variable} antialiased safe-area-shell`}>
        <AuthProvider>
          <AppBlockerGateBridge />
          <div className="app-content">{children}</div>
          <NavbarWrapper />
        </AuthProvider>
      </body>
    </html>
  );
}
