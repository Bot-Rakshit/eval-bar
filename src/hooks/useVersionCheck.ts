import { useEffect, useRef } from "react";

const VERSION_CHECK_INTERVAL_MS = 60000;

export function useVersionCheck(): void {
  const currentVersionRef = useRef<string | null>(null);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { version?: string };
        if (!data.version) return;
        if (currentVersionRef.current === null) {
          currentVersionRef.current = data.version;
        } else if (currentVersionRef.current !== data.version) {
          console.log("New version deployed, reloading...");
          window.location.reload();
        }
      } catch {
        /* offline or missing version file */
      }
    };

    void checkVersion();
    const interval = setInterval(() => void checkVersion(), VERSION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);
}
