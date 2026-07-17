export type ThemePreference = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'ke.theme-preference'

const isThemePreference = (value: string | null): value is ThemePreference =>
  value === 'light' || value === 'dark' || value === 'system'

export const getThemePreference = (): ThemePreference => {
  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemePreference(savedTheme) ? savedTheme : 'light'
}

const getResolvedTheme = (preference: ThemePreference): 'light' | 'dark' => {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const applyTheme = (preference = getThemePreference()): void => {
  const resolvedTheme = getResolvedTheme(preference)
  document.documentElement.dataset.theme = resolvedTheme
  document.documentElement.style.colorScheme = resolvedTheme
}

export const setThemePreference = (preference: ThemePreference): void => {
  window.localStorage.setItem(THEME_STORAGE_KEY, preference)
  applyTheme(preference)
}

export const watchSystemTheme = (): (() => void) => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handleChange = (): void => {
    if (getThemePreference() === 'system') applyTheme('system')
  }

  mediaQuery.addEventListener('change', handleChange)
  return (): void => mediaQuery.removeEventListener('change', handleChange)
}
