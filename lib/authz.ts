import type { Prisma, Role, SubjectStatus, UserStatus } from "@/app/generated/prisma/client";
import { cookies } from "next/headers";
import { verifyJWT } from "./auth";
import { prisma } from "./db";
import { ApiError } from "./errors";

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
};

export type SubjectSummary = {
  id: number;
  name: string;
  status: SubjectStatus;
  userId: number | null;
};

const COOKIE_NAME = "pgcip_token";

/**
 * Resolves the current user from the PGOS JWT cookie. This replaces the
 * NextAuth session lookup used by the original Mock Exam app.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: number;
  try {
    const payload = await verifyJWT(token);
    userId = payload.userId;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, status: true, isAdmin: true },
  });

  if (!user || user.status !== "ACTIVE") return null;

  // Legacy PGOS admins were flagged with isAdmin and had no role value.
  const role: Role = user.isAdmin && user.role === "STUDENT" ? "SUPER_ADMIN" : user.role;

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role,
    status: user.status,
  };
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

/**
 * Student-facing features are available to every active account. Admins can
 * use the study/exam experience too; they are not redirected away from it.
 */
export async function requireStudent(): Promise<CurrentUser> {
  return requireUser();
}

export async function requireSuperAdmin(): Promise<CurrentUser> {
  return requireRole("SUPER_ADMIN");
}

export function isAdminRole(role: Role): boolean {
  return role === "SUPER_ADMIN" || role === "SUBJECT_ADMIN";
}

async function loadSubject(subjectId: number): Promise<SubjectSummary> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, name: true, status: true, userId: true },
  });
  if (!subject) {
    throw new ApiError(404, "NOT_FOUND", "Subject not found.");
  }
  return subject;
}

async function isAssignedAdmin(userId: number, subjectId: number): Promise<boolean> {
  const assignment = await prisma.subjectAdmin.findUnique({
    where: { subjectId_userId: { subjectId, userId } },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function requireSubjectManage(
  subjectId: number | null,
): Promise<{ user: CurrentUser; subject: SubjectSummary | null }> {
  const user = await requireUser();
  if (subjectId === null) {
    if (user.role === "SUPER_ADMIN") return { user, subject: null };
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to manage this resource.");
  }
  const subject = await loadSubject(subjectId);

  if (user.role === "SUPER_ADMIN") return { user, subject };

  // A personal subject is managed by its owner.
  if (subject.userId === user.id) return { user, subject };

  if (user.role !== "SUBJECT_ADMIN") {
    throw new ApiError(403, "FORBIDDEN", "You do not have permission to manage this subject.");
  }

  if (!(await isAssignedAdmin(user.id, subjectId))) {
    throw new ApiError(403, "FORBIDDEN", "You are not assigned to this subject.");
  }

  return { user, subject };
}

export async function requireSubjectStudy(
  subjectId: number,
): Promise<{ user: CurrentUser; subject: SubjectSummary }> {
  const user = await requireUser();
  const subject = await loadSubject(subjectId);

  if (user.role === "SUPER_ADMIN") return { user, subject };
  if (subject.userId === user.id) return { user, subject };

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
export async function accessibleSubjectIds(user: CurrentUser): Promise<number[] | null> {
  if (user.role === "SUPER_ADMIN") return null;

  if (user.role === "SUBJECT_ADMIN") {
    const assignments = await prisma.subjectAdmin.findMany({
      where: { userId: user.id },
      select: { subjectId: true },
    });
    return assignments.map((assignment) => assignment.subjectId);
  }

  // Students see shared subjects plus their own personal subjects.
  const subjects = await prisma.subject.findMany({
    where: {
      status: "ACTIVE",
      OR: [{ userId: null }, { userId: user.id }],
    },
    select: { id: true },
  });
  return subjects.map((subject) => subject.id);
}

export async function scopeSubjectIds(
  user: CurrentUser,
  requestedSubjectId?: number,
): Promise<number[] | null> {
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
  return {
    status: "ACTIVE",
    OR: [{ userId: null }, { userId: user.id }],
  };
}

export function subjectIdFilterWhere(subjectIds: number[] | null): Prisma.SubjectWhereInput {
  return subjectIds === null ? {} : { id: { in: subjectIds } };
}
