import { z } from 'zod'

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50).optional(),
  avatar: z.string().url('Avatar must be a valid URL').nullable().optional(),
  bio: z.string().max(500, 'Bio too long').nullable().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
