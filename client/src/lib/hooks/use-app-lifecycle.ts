"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

export function useAppLifecycle() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const backHandler = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });

    const resumeHandler = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        document.dispatchEvent(new CustomEvent("app:resume"));
      } else {
        document.dispatchEvent(new CustomEvent("app:pause"));
      }
    });

    return () => {
      backHandler.then((h) => h.remove());
      resumeHandler.then((h) => h.remove());
    };
  }, []);
}
