"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppLockPlugin, getIconUrl } from "./plugin";
import type { InstalledApp } from "./plugin";

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

export function AppLockView() {
    const [apps, setApps] = useState<InstalledApp[]>([]);
    const [lockedSet, setLockedSet] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [serviceActive, setServiceActive] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [permissions, setPermissions] = useState({
        usageAccess: false,
        overlay: false,
    });

    const refreshData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [installedRes, lockedRes, perms] = await Promise.all([
            AppLockPlugin.getInstalledApps(),
            AppLockPlugin.getLockedApps(),
                AppLockPlugin.checkPermissions(),
            ]);
            const sortedApps = [...installedRes.apps].sort((a, b) =>
                a.appName.localeCompare(b.appName)
            );
            setApps(sortedApps);
            setLockedSet(new Set(lockedRes.packages));
            setPermissions(perms);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to load app lock data";
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refreshData();
    }, []);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                void refreshData();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, []);

    const toggleApp = (pkg: string) => {
        setLockedSet((prev) => {
            const next = new Set(prev);
            if (next.has(pkg)) next.delete(pkg);
            else next.add(pkg);
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await AppLockPlugin.setLockedApps({ packages: Array.from(lockedSet) });
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to save app lock selection";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleService = async () => {
        setError(null);
        try {
            if (serviceActive) {
                await AppLockPlugin.stopLockService();
                setServiceActive(false);
                return;
            }

            const perms = await AppLockPlugin.checkPermissions();
            setPermissions(perms);
            if (!perms.usageAccess) {
                await AppLockPlugin.requestUsagePermission();
                return;
            }
            if (!perms.overlay) {
                await AppLockPlugin.requestOverlayPermission();
                return;
            }
            await handleSave();
            await AppLockPlugin.startLockService();
            setServiceActive(true);
        } catch (e) {
            const message = e instanceof Error ? e.message : "Failed to toggle lock service";
            setError(message);
        }
    };

    const filtered = apps.filter((a) =>
        a.appName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-container pg-page">
            <div className="pg-header">
                <Link href="/app" className="btn-link pg-back">
                    {"<"}- Back
                </Link>
                <h1 className="page-title">[!] App Lock</h1>
                <p className="pg-subtitle">
                    Select apps to lock - a question will be asked before opening
                </p>
            </div>

            <div className={`card pg-status-bar ${serviceActive ? "pg-status--active" : "pg-status--inactive"}`}>
                <div>
                    <span className="pg-status-label">Protection</span>
                    <span className="pg-status-value">
                        {serviceActive ? "Active" : "Inactive"}
                    </span>
                </div>
                <button onClick={handleToggleService} className="btn btn-sm pg-toggle-btn">
                    {serviceActive ? "Stop" : "Start"}
                </button>
            </div>

            {(!permissions.usageAccess || !permissions.overlay) && (
                <div className="card" style={{ marginTop: 12 }}>
                    <p className="pg-subtitle" style={{ marginBottom: 8 }}>
                        Missing required permissions
                    </p>
                    {!permissions.usageAccess && (
                        <button
                            onClick={() => void AppLockPlugin.requestUsagePermission()}
                            className="btn btn-sm"
                            style={{ marginRight: 8 }}
                        >
                            Grant Usage Access
                        </button>
                    )}
                    {!permissions.overlay && (
                        <button
                            onClick={() => void AppLockPlugin.requestOverlayPermission()}
                            className="btn btn-sm"
                        >
                            Grant Overlay Permission
                        </button>
                    )}
                    <button
                        onClick={() => void refreshData()}
                        className="btn btn-sm"
                        style={{ marginLeft: 8 }}
                    >
                        Refresh
                    </button>
                </div>
            )}

            {error && <p className="error-text">{error}</p>}

            <input
                type="text"
                placeholder="Search apps..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pg-search"
            />

            <p className="pg-count">
                {lockedSet.size} app{lockedSet.size !== 1 ? "s" : ""} locked
            </p>

            {loading ? (
                <p className="loading-text">Loading apps...</p>
            ) : (
                <div className="pg-app-list">
                    {filtered.map((app) => {
                        const isLocked = lockedSet.has(app.packageName);
                        return (
                            <div
                                key={app.packageName}
                                className={`pg-app-row pg-app-row--toggle ${isLocked ? "pg-app-row--locked" : ""}`}
                                onClick={() => toggleApp(app.packageName)}
                            >
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
                                <span className="pg-app-name">{app.appName}</span>
                                <div className={`pg-toggle ${isLocked ? "pg-toggle--on" : ""}`}>
                                    <div className="pg-toggle-knob" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && (
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary pg-save-btn"
                >
                    {saving ? "Saving..." : "[=] Save Selection"}
                </button>
            )}
        </div>
    );
}
