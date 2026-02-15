"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

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

export const AppLockPlugin: AppLockPluginInterface = Capacitor.isNativePlatform()
  ? registerPlugin<AppLockPluginInterface>("AppLock")
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
