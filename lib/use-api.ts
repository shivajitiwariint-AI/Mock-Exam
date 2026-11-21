"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, getErrorMessage } from "./client-api";

export function useApiData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }

    const current = requestId.current + 1;
    requestId.current = current;
    setLoading(true);
    setError(null);

    try {
      const result = await apiFetch<T>(url);
      if (requestId.current === current) setData(result);
    } catch (loadError) {
      if (requestId.current === current) setError(getErrorMessage(loadError));
    } finally {
      if (requestId.current === current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    // Initial fetch on mount / URL change; reload owns the request lifecycle.
    void reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
