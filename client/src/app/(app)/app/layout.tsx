"use client";

import { AuthProvider } from "@/components/auth-provider";
import { StackableMenu } from "@/components/stackable-menu";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-parchment">
        <header className="flex items-center justify-between border-b border-twig px-4 py-3">
          <h1 className="text-lg text-deep-forest">Mind Bloom</h1>
          <StackableMenu />
        </header>

        <main className="flex-1 px-4 py-6">{children}</main>
      </div>
    </AuthProvider>
  );
}
