'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  // The app currently ships a complete light theme only. Dark mode is disabled
  // until every surface supports it, so OS-dark users get a consistent UI.
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
      {children}
    </ThemeProvider>
  )
}
