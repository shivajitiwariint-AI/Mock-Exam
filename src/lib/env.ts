export const isProduction = process.env.NODE_ENV === "production";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function maxUploadBytes(): number {
  const configured = Number(process.env.MAX_UPLOAD_MB ?? "15");
  const megabytes = Number.isFinite(configured) && configured > 0 ? configured : 15;
  return Math.min(megabytes, 50) * 1024 * 1024;
}

export function appBaseUrl(): string {
  return (
    optionalEnv("AUTH_URL") ??
    optionalEnv("NEXT_PUBLIC_APP_URL") ??
    (optionalEnv("VERCEL_URL") ? `https://${optionalEnv("VERCEL_URL")}` : "http://localhost:3000")
  );
}
