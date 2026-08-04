export type AuthUser = {
  userId: number
  email: string
}

export type UserProfileData = {
  id: number
  name: string
  avatar: string | null
  bio: string | null
}

export type CurrentUser = {
  id: number
  email: string
  profile: UserProfileData | null
}

export type ModuleSummary = {
  name: string
  icon: string
  stat: string
  href: string
  color: string
}

export type ToastType = 'success' | 'error' | 'info'

export type ApiError = {
  error: string
  fields?: Record<string, string>
}
