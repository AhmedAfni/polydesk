export function formatRelativeTime(dateInput: string | Date | undefined): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (isNaN(diffInSeconds) || diffInSeconds < 10) return 'just now'
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) return `${diffInDays}d ago`

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) return `${diffInMonths}mo ago`

  return `${Math.floor(diffInDays / 365)}y ago`
}

export function getLanguageName(code: string | null | undefined): string {
  if (!code) return ''
  const normalized = code.toLowerCase().trim()
  const languageNames: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    zh: 'Chinese',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
    ru: 'Russian',
  }
  return languageNames[normalized] || code.toUpperCase()
}
