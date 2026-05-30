"use client";

import { useEffect } from "react";
import { getAuthToken } from "@/lib/auth-client";

const SESSION_KEY = "pledgeoff_auto_join_checked";

export function AutoJoinChecker() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    void (async () => {
      const token = await getAuthToken();
      if (!token) return;
      await fetch("/api/v1/teams/auto-join", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    })();
  }, []);

  return null;
}
