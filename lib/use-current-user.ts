"use client";

import type { CurrentUser } from "@/types";
import { useApiData } from "./use-api";

export function useCurrentUser() {
  const query = useApiData<CurrentUser>("/api/auth/me");
  const legacySuperAdmin = query.data?.isAdmin === true && query.data?.role === "STUDENT";
  const isSuperAdmin = query.data?.role === "SUPER_ADMIN" || legacySuperAdmin;
  const isAdmin = isSuperAdmin || query.data?.role === "SUBJECT_ADMIN";

  return {
    ...query,
    user: query.data,
    isSuperAdmin,
    isAdmin,
  };
}
