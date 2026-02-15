import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mindbloom.app",
  appName: "Mind Bloom",
  webDir: "out",
  server: {
    url: "/app",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#1B3D1B",
      showSpinner: false,
    },
    StatusBar: {
      backgroundColor: "#1B3D1B",
      style: "DARK",
    },
    LocalNotifications: {
      smallIcon: "ic_launcher",
      iconColor: "#2D5F2D",
    },
  },
};

export default config;
