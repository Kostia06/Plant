import { useState, useEffect } from "react";

const STORAGE_KEY = "bloom_device_id";

export function useDeviceId(): string {
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setDeviceId(stored);
      return;
    }

    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    setDeviceId(id);
  }, []);

  return deviceId;
}
