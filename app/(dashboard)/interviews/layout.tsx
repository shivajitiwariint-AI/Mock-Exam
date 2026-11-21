import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser, isAdminRole } from "@/lib/authz";

export default async function InterviewsLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (user && isAdminRole(user.role)) {
    redirect("/admin/interviews");
  }

  return <>{children}</>;
}
