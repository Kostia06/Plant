"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLockPlugin, formatDuration, getIconUrl } from "./plugin";
import type { AppUsage } from "./plugin";

const APP_ICONS: Record<string, string> = {
    "com.instagram.android": "[I]",
    "com.google.android.youtube": "[Y]",
    "com.whatsapp": "[W]",
    "com.twitter.android": "[X]",
    "com.zhiliaoapp.musically": "[T]",
    "com.spotify.music": "[S]",
    "com.snapchat.android": "[C]",
    "com.discord": "[D]",
    "com.google.android.gm": "[M]",
    "com.facebook.katana": "[F]",
};

export function ScreenTimeView() {
    const [apps, setApps] = useState<AppUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalMs, setTotalMs] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [hasUsagePermission, setHasUsagePermission] = useState(true);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const perms = await AppLockPlugin.checkPermissions();
            setHasUsagePermission(perms.usageAccess);
            if (!perms.usageAccess) {
                setApps([]);
                setTotalMs(0);
                return;
            }

            const { apps } = await AppLockPlugin.getScreenTime();
            const usedApps = apps.filter((app) => app.usageMs >= 60000);
            const sorted = usedApps.sort((a, b) => b.usageMs - a.usageMs);
            setApps(sorted);
            setTotalMs(sorted.reduce((sum, a) => sum + a.usageMs, 0));
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to load usage data";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
    }, []);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                void refresh();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, []);

    const maxUsage = apps.length > 0 ? apps[0].usageMs : 1;

    return (
        <div className="page-container pg-page">
            <div className="pg-header">
                <Link href="/app" className="btn-link pg-back">
                    {"<"}- Back
                </Link>
                <h1 className="page-title">[%] Screen Time</h1>
                <p className="pg-subtitle">Today&apos;s usage</p>
            </div>

            <div className="card pg-total-card">
                <span className="pg-total-label">Total Screen Time</span>
                <span className="pg-total-value">
                    {loading ? "..." : formatDuration(totalMs)}
                </span>
            </div>

            {!hasUsagePermission && (
                <div className="card" style={{ marginBottom: 12 }}>
                    <p className="pg-subtitle" style={{ marginBottom: 8 }}>
                        Usage access is required to read screen time.
                    </p>
                    <button
                        onClick={() => void AppLockPlugin.requestUsagePermission()}
                        className="btn btn-sm"
                        style={{ marginRight: 8 }}
                    >
                        Grant Usage Access
                    </button>
                    <button onClick={() => void refresh()} className="btn btn-sm">
                        Refresh
                    </button>
                </div>
            )}

            {error && <p className="error-text">{error}</p>}

            {loading ? (
                <p className="loading-text">Loading usage data...</p>
            ) : (
                <div className="pg-app-list">
                    {apps.map((app) => (
                        <div key={app.packageName} className="pg-app-row">
                            <span className="pg-app-icon">
                                {app.icon ? (
                                    <img
                                        src={getIconUrl(app.icon) || ""}
                                        alt={app.appName}
                                        className="pg-native-icon"
                                    />
                                ) : (
                                    <span className="px-icon">
                                        {APP_ICONS[app.packageName] || "[.]"}
                                    </span>
                                )}
                            </span>
                            <div className="pg-app-info">
                                <span className="pg-app-name">{app.appName}</span>
                                <div className="pg-bar-track">
                                    <div
                                        className="pg-bar-fill"
                                        style={{
                                            width: `${Math.min(100, Math.max((app.usageMs / maxUsage) * 100, 4))}%`,
                                        }}
                                    />
                                </div>
                            </div>
                            <span className="pg-app-time">{formatDuration(app.usageMs)}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
