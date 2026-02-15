"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { AppBlocker } from "@/lib/capacitor-plugins/app-blocker";

export function AppBlockerGateBridge() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        let disposed = false;

        const pollPendingBlockedApp = async () => {
            if (disposed) return;
            try {
                const pending = await AppBlocker.consumePendingBlockedApp();
                if (!pending.pending || !pending.packageName) return;

                const params = new URLSearchParams({
                    appId: pending.packageName,
                    appName: pending.appName ?? pending.packageName,
                });
                const target = `/app/lock-gate?${params.toString()}`;
                if (pathname !== "/app/lock-gate") {
                    router.push(target);
                } else {
                    router.replace(target);
                }
            } catch {
                // Ignore transient bridge errors while app boots.
            }
        };

        void pollPendingBlockedApp();
        const interval = window.setInterval(() => void pollPendingBlockedApp(), 1500);
        return () => {
            disposed = true;
            window.clearInterval(interval);
        };
    }, [pathname, router]);

    return null;
}
