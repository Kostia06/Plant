"use client";

import { LockGateScreen } from "@/components/lock-gate";

export default function LockGatePage() {
    return (
        <div className="page-container">
            <LockGateScreen appId="demo" appName="Instagram" />
        </div>
    );
}
