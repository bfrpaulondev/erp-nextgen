/**
 * Date Utilities for ERP Next-Gen
 * Using date-fns for consistent date handling
 */

import {
  format,
  formatDistance,
  formatRelative,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addMonths,
  addYears,
  subDays,
  subMonths,
  subYears,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  isAfter,
  isBefore,
  isToday,
  isThisMonth,
  isThisYear,
  isSameDay,
  isSameMonth,
  isSameYear,
} from 'date-fns'
import { pt } from 'date-fns/locale'

// Portuguese locale for date-fns
const locale = pt

/**
 * Format date with Portuguese locale
 */
export function formatDate(
  date: Date | string,
  formatStr: string = 'dd/MM/yyyy'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  
  if (!isValid(dateObj)) return ''
  
  return format(dateObj, formatStr, { locale })
}

/**
 * Format date for display (short)
 */
export function formatDateShort(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy')
}

/**
 * Format date for display (long)
 */
export function formatDateLong(date: Date | string): string {
  return formatDate(date, "d 'de' MMMM 'de' yyyy")
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy HH:mm')
}

/**
 * Format time only
 */
export function formatTime(date: Date | string): string {
  return formatDate(date, 'HH:mm')
}

/**
 * Format for document numbers (e.g., 2024/001)
 */
export function formatDocumentYear(date: Date | string = new Date()): string {
  return formatDate(date, 'yyyy')
}

/**
 * Format for API/Database (ISO format)
 */
export function formatISO(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
}

/**
 * Relative time (e.g., "há 2 dias")
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return formatDistance(dateObj, new Date(), { addSuffix: true, locale })
}

/**
 * Get current date range helpers
 */
export const dateRanges = {
  today: () => ({
    start: startOfDay(new Date()),
    end: endOfDay(new Date()),
  }),
  
  thisMonth: () => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  }),
  
  thisYear: () => ({
    start: startOfYear(new Date()),
    end: endOfYear(new Date()),
  }),
  
  last7Days: () => ({
    start: startOfDay(subDays(new Date(), 7)),
    end: endOfDay(new Date()),
  }),
  
  last30Days: () => ({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  }),
  
  lastMonth: () => ({
    start: startOfMonth(subMonths(new Date(), 1)),
    end: endOfMonth(subMonths(new Date(), 1)),
  }),
  
  lastYear: () => ({
    start: startOfYear(subYears(new Date(), 1)),
    end: endOfYear(subYears(new Date(), 1)),
  }),
}

/**
 * Date manipulation helpers
 */
export const dateUtils = {
  addDays,
  addMonths,
  addYears,
  subDays,
  subMonths,
  subYears,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  isAfter,
  isBefore,
  isToday,
  isThisMonth,
  isThisYear,
  isSameDay,
  isSameMonth,
  isSameYear,
  isValid,
  parseISO,
}

/**
 * Get month name in Portuguese
 */
export function getMonthName(month: number, short: boolean = false): string {
  const date = new Date(2024, month - 1, 1)
  return format(date, short ? 'MMM' : 'MMMM', { locale })
}

/**
 * Get weekday names in Portuguese
 */
export function getWeekdayNames(short: boolean = false): string[] {
  const formatStr = short ? 'EEE' : 'EEEE'
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, i + 1) // Start from Monday
    return format(date, formatStr, { locale })
  })
}

/**
 * Calculate due date based on payment terms
 */
export function calculateDueDate(
  issueDate: Date | string,
  paymentTerms: number = 30
): Date {
  const date = typeof issueDate === 'string' ? parseISO(issueDate) : issueDate
  return addDays(date, paymentTerms)
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dueDate: Date | string): boolean {
  const date = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  return isBefore(date, startOfDay(new Date()))
}

/**
 * Get days until due/past due
 */
export function getDaysUntilDue(dueDate: Date | string): number {
  const date = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate
  return differenceInDays(date, new Date())
}
