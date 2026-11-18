import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";

export default async function InterviewsLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;

  if (role === "SUPER_ADMIN" || role === "SUBJECT_ADMIN") {
    redirect("/admin/interviews");
  }

  return <>{children}</>;
}
