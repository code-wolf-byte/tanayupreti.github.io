"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: {
  children: React.ReactNode
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// Create a context for view mode (normal/terminal)
export const ViewModeContext = React.createContext({
  viewMode: 'normal',
  setViewMode: (mode: 'normal' | 'terminal') => {},
})

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = React.useState<'normal' | 'terminal'>('normal')

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  )
} 