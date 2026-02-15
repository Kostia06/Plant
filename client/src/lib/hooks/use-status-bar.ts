"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export function useStatusBar() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    StatusBar.setBackgroundColor({ color: "#1B3D1B" });
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setOverlaysWebView({ overlay: false });
  }, []);
}
