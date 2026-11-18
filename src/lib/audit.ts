import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
};

export async function recordAudit(input: AuditInput, db: DbClient = prisma): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function safeRecordAudit(input: AuditInput): Promise<void> {
  try {
    await recordAudit(input);
  } catch (error) {
    console.error("[audit] failed to record audit event", {
      action: input.action,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
