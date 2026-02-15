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

    useEffect(() => {
        Promise.all([
            AppLockPlugin.getInstalledApps(),
            AppLockPlugin.getLockedApps(),
        ]).then(([{ apps }, { packages }]) => {
            setApps(apps.sort((a, b) => a.appName.localeCompare(b.appName)));
            setLockedSet(new Set(packages));
            setLoading(false);
        });
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
        await AppLockPlugin.setLockedApps({ packages: Array.from(lockedSet) });
        setSaving(false);
    };

    const handleToggleService = async () => {
        if (serviceActive) {
            await AppLockPlugin.stopLockService();
        } else {
            const perms = await AppLockPlugin.checkPermissions();
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
        }
        setServiceActive(!serviceActive);
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
