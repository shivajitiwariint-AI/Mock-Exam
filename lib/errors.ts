import { Prisma } from "@/app/generated/prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status },
  );
}

export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return errorResponse(422, "VALIDATION_ERROR", "The request contains invalid data.", {
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return errorResponse(409, "CONFLICT", "A record with these values already exists.");
    }
    if (error.code === "P2025") {
      return errorResponse(404, "NOT_FOUND", "The requested record was not found.");
    }
    if (error.code === "P2003") {
      return errorResponse(409, "RELATION_CONFLICT", "This action conflicts with related records.");
    }
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  console.error("[api] unhandled error", {
    name: error instanceof Error ? error.name : typeof error,
    message,
  });
  return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}

export async function withApi(handler: () => Promise<Response>): Promise<Response> {
  try {
    return await handler();
  } catch (error) {
    return toErrorResponse(error);
  }
}
