import { requireEnv } from './env'

/**
 * Resolves the JWT signing secret.
 *
 * Failing fast is intentional: falling back to a well-known default would let
 * anyone forge tokens (including admin tokens). This is shared by the API,
 * middleware and the public landing page so there is exactly one source of
 * truth for the secret.
 */
export function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv('JWT_SECRET'))
}
