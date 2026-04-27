"use client";

import { useEffect } from "react";

export function AutoRefresh() {
  useEffect(() => {
    // Refresh every 10 minutes
    const interval = setInterval(() => {
      window.location.reload();
    }, 10 * 60 * 1000); // 10 minutes in milliseconds

    return () => clearInterval(interval);
  }, []);

  return null;
}
