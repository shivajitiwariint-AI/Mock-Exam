import type { Prisma, Role, SubjectStatus, UserStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "./db";
import { ApiError } from "./errors";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
};

export type SubjectSummary = {
  id: string;
  name: string;
  status: SubjectStatus;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, status: true },
  });

  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "UNAUTHORIZED", "You must sign in to continue.");
  }
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }
  return user;
}

export async function requireStudent(): Promise<CurrentUser> {
  return requireRole("STUDENT");
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  return requireRole("SUPER_ADMIN");
}

export function isAdminRole(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "SUBJECT_ADMIN";
}

async function loadSubject(subjectId: string): Promise<SubjectSummary> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, name: true, status: true },
  });
  if (!subject) {
    throw new ApiError(404, "NOT_FOUND", "Subject not found.");
  }
  return subject;
}

async function isAssignedAdmin(userId: string, subjectId: string): Promise<boolean> {
  const assignment = await prisma.subjectAdmin.findUnique({
    where: { subjectId_userId: { subjectId, userId } },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function requireSubjectManage(
  subjectId: string,
): Promise<{ user: CurrentUser; subject: SubjectSummary }> {
  const user = await requireUser();
  const subject = await loadSubject(subjectId);

  if (user.role === "SUPER_ADMIN") return { user, subject };

  if (user.role !== "SUBJECT_ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to manage this subject.");
  }

  if (!(await isAssignedAdmin(user.id, subjectId))) {
    throw new ApiError(403, "FORBIDDEN", "You are not assigned to this subject.");
  }

  return { user, subject };
}

export async function requireSubjectStudy(
  subjectId: string,
): Promise<{ user: CurrentUser; subject: SubjectSummary }> {
  const user = await requireUser();
  const subject = await loadSubject(subjectId);

  if (user.role === "SUPER_ADMIN") return { user, subject };

  if (user.role === "SUBJECT_ADMIN") {
    if (!(await isAssignedAdmin(user.id, subjectId))) {
      throw new ApiError(403, "FORBIDDEN", "You are not assigned to this subject.");
    }
    return { user, subject };
  }

  if (subject.status !== "ACTIVE") {
    throw new ApiError(403, "FORBIDDEN", "This subject is not currently available.");
  }

  return { user, subject };
}

/**
 * Returns null for super admins (all subjects), otherwise an explicit list of
 * subject IDs the user may access. Used to build query filters; never derive
 * access from client-supplied subject IDs.
 */
export async function accessibleSubjectIds(user: CurrentUser): Promise<string[] | null> {
  if (user.role === "SUPER_ADMIN") return null;

  if (user.role === "SUBJECT_ADMIN") {
    const assignments = await prisma.subjectAdmin.findMany({
      where: { userId: user.id },
      select: { subjectId: true },
    });
    return assignments.map((assignment) => assignment.subjectId);
  }

  const subjects = await prisma.subject.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  return subjects.map((subject) => subject.id);
}

export async function scopeSubjectIds(
  user: CurrentUser,
  requestedSubjectId?: string,
): Promise<string[] | null> {
  const allowed = await accessibleSubjectIds(user);
  if (requestedSubjectId) {
    if (allowed !== null && !allowed.includes(requestedSubjectId)) {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to this subject.");
    }
    return [requestedSubjectId];
  }
  return allowed;
}

export function subjectScopeWhere(user: CurrentUser): Prisma.SubjectWhereInput {
  if (user.role === "SUPER_ADMIN") return {};
  if (user.role === "SUBJECT_ADMIN") {
    return { admins: { some: { userId: user.id } } };
  }
  return { status: "ACTIVE" };
}

export function subjectIdFilterWhere(subjectIds: string[] | null): Prisma.SubjectWhereInput {
  return subjectIds === null ? {} : { id: { in: subjectIds } };
}
