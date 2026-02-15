import { registerPlugin } from "@capacitor/core";

export interface AppUsageStat {
    packageName: string;
    totalTimeMs: number;
    lastUsed: number;
}

export interface InstalledApp {
    packageName: string;
    appName: string;
    isSystem: boolean;
}

export interface PermissionResult {
    granted: boolean;
    message?: string;
}

export interface AppBlockerPlugin {
    checkPermission(): Promise<PermissionResult>;
    requestPermission(): Promise<PermissionResult>;
    setBlockedApps(options: { packages: string[] }): Promise<void>;
    getBlockedApps(): Promise<{ packages: string[] }>;
    startMonitoring(options?: { intervalMs?: number }): Promise<void>;
    stopMonitoring(): Promise<void>;
    getAppUsageStats(options?: { daysBack?: number }): Promise<{ stats: AppUsageStat[] }>;
    getInstalledApps(): Promise<{ apps: InstalledApp[] }>;
    addListener(
        eventName: "appBlocked",
        callback: (event: { package: string; timestamp: number }) => void,
    ): Promise<{ remove: () => Promise<void> }>;
}

export const AppBlocker = registerPlugin<AppBlockerPlugin>("AppBlocker");
