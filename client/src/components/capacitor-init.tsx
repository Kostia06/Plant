"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { useStatusBar } from "@/lib/hooks/use-status-bar";
import { useAppLifecycle } from "@/lib/hooks/use-app-lifecycle";
import { setupNotificationChannel } from "@/lib/services/notification-service";

export function CapacitorInit() {
  useStatusBar();
  useAppLifecycle();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    SplashScreen.hide();
    setupNotificationChannel();
  }, []);

  return null;
}
