/**
 * Custom validation hook for fiscal IDs
 */

import { useState, useCallback } from 'react'
import { validateFiscalId, validatePhone, validatePostalCode } from '@/lib/validators'

export function useFiscalValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateFiscalIdField = useCallback((
    value: string, 
    country: 'PT' | 'AO',
    fieldName: string = 'fiscalId'
  ): boolean => {
    const result = validateFiscalId(value, country)
    
    if (!result.valid) {
      setErrors(prev => ({ ...prev, [fieldName]: result.error || 'Inválido' }))
      return false
    }
    
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
    return true
  }, [])

  const validatePhoneField = useCallback((
    value: string,
    country: 'PT' | 'AO',
    fieldName: string = 'phone'
  ): boolean => {
    const result = validatePhone(value, country)
    
    if (!result.valid) {
      setErrors(prev => ({ ...prev, [fieldName]: result.error || 'Inválido' }))
      return false
    }
    
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
    return true
  }, [])

  const validatePostalCodeField = useCallback((
    value: string,
    country: 'PT' | 'AO',
    fieldName: string = 'postalCode'
  ): boolean => {
    const result = validatePostalCode(value, country)
    
    if (!result.valid) {
      setErrors(prev => ({ ...prev, [fieldName]: result.error || 'Inválido' }))
      return false
    }
    
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
    return true
  }, [])

  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    errors,
    validateFiscalIdField,
    validatePhoneField,
    validatePostalCodeField,
    clearError,
    clearAllErrors,
    hasErrors: Object.keys(errors).length > 0,
  }
}
