"use client";

import { Capacitor } from "@capacitor/core";
import { AppBlocker } from "@/lib/capacitor-plugins/app-blocker";
import type { AppUsageStat } from "@/lib/capacitor-plugins/app-blocker";

export interface AppUsage {
    packageName: string;
    appName: string;
    usageMs: number;
    icon?: string;
}

export interface InstalledApp {
    packageName: string;
    appName: string;
    icon?: string;
    isSystem?: boolean;
}

export interface AppLockPluginInterface {
    getScreenTime(): Promise<{ apps: AppUsage[] }>;
    getInstalledApps(): Promise<{ apps: InstalledApp[] }>;
    setLockedApps(options: { packages: string[] }): Promise<void>;
    getLockedApps(): Promise<{ packages: string[] }>;
    startLockService(): Promise<void>;
    stopLockService(): Promise<void>;
    checkPermissions(): Promise<{ usageAccess: boolean; overlay: boolean }>;
    requestUsagePermission(): Promise<void>;
    requestOverlayPermission(): Promise<void>;
}

const MOCK_SCREEN_TIME: AppUsage[] = [
    { packageName: "com.instagram.android", appName: "Instagram", usageMs: 5400000 },
    { packageName: "com.google.android.youtube", appName: "YouTube", usageMs: 3600000 },
    { packageName: "com.whatsapp", appName: "WhatsApp", usageMs: 2700000 },
    { packageName: "com.twitter.android", appName: "X (Twitter)", usageMs: 1800000 },
    { packageName: "com.zhiliaoapp.musically", appName: "TikTok", usageMs: 1500000 },
    { packageName: "com.spotify.music", appName: "Spotify", usageMs: 900000 },
    { packageName: "com.snapchat.android", appName: "Snapchat", usageMs: 600000 },
    { packageName: "com.discord", appName: "Discord", usageMs: 450000 },
];

const MOCK_INSTALLED: InstalledApp[] = [
    { packageName: "com.instagram.android", appName: "Instagram" },
    { packageName: "com.google.android.youtube", appName: "YouTube" },
    { packageName: "com.whatsapp", appName: "WhatsApp" },
    { packageName: "com.twitter.android", appName: "X (Twitter)" },
    { packageName: "com.zhiliaoapp.musically", appName: "TikTok" },
    { packageName: "com.spotify.music", appName: "Spotify" },
    { packageName: "com.snapchat.android", appName: "Snapchat" },
    { packageName: "com.discord", appName: "Discord" },
    { packageName: "com.google.android.gm", appName: "Gmail" },
    { packageName: "com.facebook.katana", appName: "Facebook" },
];

let mockLocked: string[] = [];

const mockPlugin: AppLockPluginInterface = {
    async getScreenTime() {
        return { apps: MOCK_SCREEN_TIME };
    },
    async getInstalledApps() {
        return { apps: MOCK_INSTALLED };
    },
    async setLockedApps({ packages }) {
        mockLocked = packages;
    },
    async getLockedApps() {
        return { packages: [...mockLocked] };
    },
    async startLockService() {
        console.log("[Mock] Lock service started");
    },
    async stopLockService() {
        console.log("[Mock] Lock service stopped");
    },
    async checkPermissions() {
        return { usageAccess: true, overlay: true };
    },
    async requestUsagePermission() {
        console.log("[Mock] Usage permission requested");
    },
    async requestOverlayPermission() {
        console.log("[Mock] Overlay permission requested");
    },
};

const nativePlugin: AppLockPluginInterface = {
    async getScreenTime() {
        const [{ stats }, { apps }] = await Promise.all([
            AppBlocker.getAppUsageStats({ daysBack: 1 }),
            AppBlocker.getInstalledApps(),
        ]);

        const appNameMap = new Map<string, string>(
            apps.map((app) => [app.packageName, app.appName]),
        );
        const appIconMap = new Map<string, string | undefined>(
            apps.map((app) => [app.packageName, app.icon]),
        );

        const normalized: AppUsage[] = stats.map((stat: AppUsageStat) => ({
            packageName: stat.packageName,
            appName: stat.appName ?? appNameMap.get(stat.packageName) ?? stat.packageName,
            usageMs: stat.totalTimeMs,
            icon: stat.icon ?? appIconMap.get(stat.packageName),
        }));

        return { apps: normalized };
    },
    async getInstalledApps() {
        const { apps } = await AppBlocker.getInstalledApps();
        return { apps };
    },
    async setLockedApps({ packages }) {
        await AppBlocker.setBlockedApps({ packages });
    },
    async getLockedApps() {
        const { packages } = await AppBlocker.getBlockedApps();
        return { packages };
    },
    async startLockService() {
        await AppBlocker.startMonitoring({ intervalMs: 2000 });
    },
    async stopLockService() {
        await AppBlocker.stopMonitoring();
    },
    async checkPermissions() {
        const [{ granted: usageAccess }, { granted: overlay }] = await Promise.all([
            AppBlocker.checkPermission(),
            AppBlocker.checkOverlayPermission(),
        ]);
        return { usageAccess, overlay };
    },
    async requestUsagePermission() {
        await AppBlocker.requestPermission();
    },
    async requestOverlayPermission() {
        await AppBlocker.requestOverlayPermission();
    },
};

export const AppLockPlugin: AppLockPluginInterface = Capacitor.isNativePlatform()
    ? nativePlugin
    : mockPlugin;

export function getIconUrl(path: string | undefined): string | null {
    if (!path) return null;
    if (!Capacitor.isNativePlatform()) return path;
    return Capacitor.convertFileSrc(path);
}

export function formatDuration(ms: number): string {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}
