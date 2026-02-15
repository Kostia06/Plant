"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
    AppBlocker,
    type AppUsageStat,
    type InstalledApp,
} from "@/lib/capacitor-plugins/app-blocker";

export function useAppBlocker() {
    const [hasPermission, setHasPermission] = useState(false);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [blockedApps, setBlockedApps] = useState<string[]>([]);
    const listenerRef = useRef<{ remove: () => Promise<void> } | null>(null);

    const isNative = Capacitor.isNativePlatform();

    const checkPermission = useCallback(async () => {
        if (!isNative) return false;
        const { granted } = await AppBlocker.checkPermission();
        setHasPermission(granted);
        return granted;
    }, [isNative]);

    const requestPermission = useCallback(async () => {
        if (!isNative) return false;
        const { granted } = await AppBlocker.requestPermission();
        setHasPermission(granted);
        return granted;
    }, [isNative]);

    const updateBlockedApps = useCallback(
        async (packages: string[]) => {
            if (!isNative) return;
            await AppBlocker.setBlockedApps({ packages });
            setBlockedApps(packages);
        },
        [isNative],
    );

    const fetchBlockedApps = useCallback(async () => {
        if (!isNative) return [];
        const { packages } = await AppBlocker.getBlockedApps();
        setBlockedApps(packages);
        return packages;
    }, [isNative]);

    const startMonitoring = useCallback(
        async (onBlocked?: (pkg: string) => void) => {
            if (!isNative || !hasPermission) return;

            listenerRef.current = await AppBlocker.addListener(
                "appBlocked",
                (event) => onBlocked?.(event.package),
            );

            await AppBlocker.startMonitoring({ intervalMs: 5000 });
            setIsMonitoring(true);
        },
        [isNative, hasPermission],
    );

    const stopMonitoring = useCallback(async () => {
        if (!isNative) return;
        await AppBlocker.stopMonitoring();
        await listenerRef.current?.remove();
        listenerRef.current = null;
        setIsMonitoring(false);
    }, [isNative]);

    const getUsageStats = useCallback(
        async (daysBack = 1): Promise<AppUsageStat[]> => {
            if (!isNative || !hasPermission) return [];
            const { stats } = await AppBlocker.getAppUsageStats({ daysBack });
            return stats;
        },
        [isNative, hasPermission],
    );

    const getInstalledApps = useCallback(async (): Promise<InstalledApp[]> => {
        if (!isNative) return [];
        const { apps } = await AppBlocker.getInstalledApps();
        return apps;
    }, [isNative]);

    useEffect(() => {
        checkPermission();
        fetchBlockedApps();
    }, [checkPermission, fetchBlockedApps]);

    useEffect(() => {
        return () => {
            listenerRef.current?.remove();
        };
    }, []);

    return {
        isNative,
        hasPermission,
        isMonitoring,
        blockedApps,
        checkPermission,
        requestPermission,
        updateBlockedApps,
        startMonitoring,
        stopMonitoring,
        getUsageStats,
        getInstalledApps,
    };
}
