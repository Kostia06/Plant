import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";
import "./globals.css";

const pixelFont = Silkscreen({
  variable: "--font-pixel",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mind Bloom - Quit the Rot",
  description: "A simple, mindful way to build better digital habits. Nurture your focus, watch your progress bloom.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pixelFont.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
