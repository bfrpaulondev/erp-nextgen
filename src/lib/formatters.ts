/**
 * Currency Formatters for ERP Next-Gen
 * Supports Euro (EUR) and Kwanza (AOA)
 */

export type Currency = 'EUR' | 'AOA'

/**
 * Format currency value
 * @param value - The numeric value to format
 * @param currency - The currency code (EUR or AOA)
 * @param locale - Optional locale override
 */
export function formatCurrency(
  value: number | string,
  currency: Currency = 'EUR',
  locale?: string
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  const locales: Record<Currency, string> = {
    EUR: 'pt-PT',
    AOA: 'pt-AO',
  }
  
  const currencySymbols: Record<Currency, string> = {
    EUR: '€',
    AOA: 'Kz',
  }
  
  try {
    return new Intl.NumberFormat(locale || locales[currency], {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numValue)
  } catch {
    // Fallback for AOA (may not be supported in all environments)
    return `${numValue.toLocaleString(locale || 'pt-PT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currencySymbols[currency]}`
  }
}

/**
 * Format number with decimal places
 */
export function formatNumber(
  value: number | string,
  decimals: number = 2,
  locale: string = 'pt-PT'
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return numValue.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number | string,
  decimals: number = 1
): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return `${numValue.toFixed(decimals)}%`
}

/**
 * Format date for display
 */
export function formatDate(
  date: Date | string,
  locale: string = 'pt-PT'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

/**
 * Format date time for display
 */
export function formatDateTime(
  date: Date | string,
  locale: string = 'pt-PT'
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and thousand separators
  const cleaned = value
    .replace(/[€Kz\s]/g, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(',', '.') // Convert decimal separator
  
  return parseFloat(cleaned) || 0
}

/**
 * Convert between currencies
 * Note: In production, use real exchange rates from API
 */
export function convertCurrency(
  value: number,
  from: Currency,
  to: Currency,
  exchangeRate?: number
): number {
  if (from === to) return value
  
  // Default exchange rates (should be fetched from API in production)
  const defaultRates: Record<string, number> = {
    'EUR-AOA': 985.50, // 1 EUR = 985.50 AOA (approximate)
    'AOA-EUR': 0.001015,
  }
  
  const rate = exchangeRate || defaultRates[`${from}-${to}`] || 1
  return value * rate
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  const symbols: Record<Currency, string> = {
    EUR: '€',
    AOA: 'Kz',
  }
  return symbols[currency]
}

/**
 * Get currency name
 */
export function getCurrencyName(currency: Currency, lang: 'pt' | 'en' = 'pt'): string {
  const names: Record<Currency, Record<string, string>> = {
    EUR: { pt: 'Euro', en: 'Euro' },
    AOA: { pt: 'Kwanza', en: 'Kwanza' },
  }
  return names[currency][lang]
}
