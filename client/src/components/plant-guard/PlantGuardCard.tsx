"use client";

import Link from "next/link";

export function PlantGuardCard() {
    return (
        <div className="card pg-card">
            <div className="pg-card-header">
                <span className="px-icon">[~]</span>
                <h2 className="card-title">Plant Guard</h2>
            </div>
            <p className="card-subtitle">Block distracting apps and track screen time</p>
            <div className="pg-card-actions">
                <Link href="/settings/app-lock" className="btn btn-primary pg-card-btn">
                    [!] App Lock
                </Link>
                <Link href="/settings/screen-time" className="btn btn-primary pg-card-btn">
                    [%] Screen Time
                </Link>
            </div>
        </div>
    );
}
