export function extractCourseIdFromUrl(url: string): string | null {
  const match = url.match(/course\/view\.php\?id=(\d+)/)
  return match ? match[1] : null
}

export function extractActivityIdFromHref(href: string): string | null {
  const match = href.match(/mod\/\w+\/view\.php\?id=(\d+)/)
  return match ? match[1] : null
}

export function extractActivityFromUrl(url: string): { type: string; id: string } | null {
  const match = url.match(/mod\/(\w+)\/view\.php\?id=(\d+)/)
  return match ? { type: match[1], id: match[2] } : null
}

export function extractCourseIdFromHref(href: string): string | null {
  const match = href.match(/course\/view\.php\?id=(\d+)/)
  return match ? match[1] : null
}

export function buildCourseUrl(href: string): string {
  if (href.startsWith("http")) return href
  return `https://lms.miva.university${href.startsWith("/") ? href : "/" + href}`
}

export function cleanCourseName(name: string): string {
  return name.replace(/^Course name\s*/i, "").trim()
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export function findElement(selectors: string[]): Element | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) return element
  }
  return null
}
