import { registerPlugin } from "@capacitor/core";

export interface AppUsageStat {
    packageName: string;
    appName?: string;
    totalTimeMs: number;
    lastUsed: number;
    icon?: string;
    isSystem?: boolean;
}

export interface InstalledApp {
    packageName: string;
    appName: string;
    icon?: string;
    isSystem: boolean;
}

export interface PermissionResult {
    granted: boolean;
    message?: string;
}

export interface AppBlockerPlugin {
    checkPermission(): Promise<PermissionResult>;
    requestPermission(): Promise<PermissionResult>;
    checkOverlayPermission(): Promise<PermissionResult>;
    requestOverlayPermission(): Promise<PermissionResult>;
    setBlockedApps(options: { packages: string[] }): Promise<void>;
    getBlockedApps(): Promise<{ packages: string[] }>;
    startMonitoring(options?: { intervalMs?: number }): Promise<void>;
    stopMonitoring(): Promise<void>;
    grantTemporaryAccess(options: { packageName: string; durationSeconds: number }): Promise<void>;
    consumePendingBlockedApp(): Promise<{
        pending: boolean;
        packageName?: string;
        appName?: string;
    }>;
    getAppUsageStats(options?: { daysBack?: number }): Promise<{ stats: AppUsageStat[] }>;
    getInstalledApps(): Promise<{ apps: InstalledApp[] }>;
    addListener(
        eventName: "appBlocked",
        callback: (event: { package: string; timestamp: number }) => void,
    ): Promise<{ remove: () => Promise<void> }>;
}

export const AppBlocker = registerPlugin<AppBlockerPlugin>("AppBlocker");
