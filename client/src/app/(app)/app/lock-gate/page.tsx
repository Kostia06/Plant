"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LockGateScreen } from "@/components/lock-gate";

function LockGatePageContent() {
    const searchParams = useSearchParams();
    const appId = searchParams.get("appId") ?? "unknown.app";
    const appName = searchParams.get("appName") ?? appId;

    return (
        <div className="page-container">
            <LockGateScreen appId={appId} appName={appName} />
        </div>
    );
}

export default function LockGatePage() {
    return (
        <Suspense fallback={<div className="page-container"><p className="loading-text">Loading...</p></div>}>
            <LockGatePageContent />
        </Suspense>
    );
}
