/**
 * Validators for Portugal and Angola
 * NIF, BI, and other fiscal identifiers
 */

/**
 * Validate Portuguese NIF (Número de Identificação Fiscal)
 * 
 * Rules:
 * - Must have exactly 9 digits
 * - First digit indicates the type:
 *   - 1, 2, 3: Singular person (natural person)
 *   - 5: Collective person (company)
 *   - 6: Public collective
 *   - 7: Other collective
 *   - 8: "Herdeiro" or "Administrador"
 *   - 9: Singular person (resident abroad)
 * - Last digit is a check digit calculated with a specific algorithm
 */
export function validateNIFPT(nif: string): { valid: boolean; error?: string; type?: string } {
  // Remove spaces and dashes
  const cleanNif = nif.replace(/[\s-]/g, '')
  
  // Check if it has exactly 9 digits
  if (!/^\d{9}$/.test(cleanNif)) {
    return { valid: false, error: 'NIF deve ter exatamente 9 dígitos' }
  }
  
  // Check first digit
  const firstDigit = parseInt(cleanNif[0])
  const validFirstDigits = [1, 2, 3, 5, 6, 7, 8, 9]
  
  if (!validFirstDigits.includes(firstDigit)) {
    return { valid: false, error: 'NIF inválido' }
  }
  
  // Calculate check digit
  const checkDigit = calculateNIFCheckDigit(cleanNif)
  const lastDigit = parseInt(cleanNif[8])
  
  if (checkDigit !== lastDigit) {
    return { valid: false, error: 'NIF inválido (dígito de controlo incorreto)' }
  }
  
  // Determine type
  let type = ''
  if ([1, 2, 3].includes(firstDigit)) {
    type = 'Pessoa Singular'
  } else if (firstDigit === 5) {
    type = 'Pessoa Coletiva'
  } else if (firstDigit === 6) {
    type = 'Pessoa Coletiva Pública'
  } else if (firstDigit === 7) {
    type = 'Pessoa Coletiva Outra'
  } else if (firstDigit === 8) {
    type = 'Herdeiro/Administrador'
  } else if (firstDigit === 9) {
    type = 'Pessoa Singular (Não Residente)'
  }
  
  return { valid: true, type }
}

/**
 * Calculate NIF check digit
 */
function calculateNIFCheckDigit(nif: string): number {
  const weights = [9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  
  for (let i = 0; i < 8; i++) {
    sum += parseInt(nif[i]) * weights[i]
  }
  
  const remainder = sum % 11
  const checkDigit = remainder < 2 ? 0 : 11 - remainder
  
  return checkDigit
}

/**
 * Validate Angolan NIF (Número de Identificação Fiscal) or B.I (Bilhete de Identidade)
 * 
 * NIF Angola:
 * - 10 digits for companies and individuals
 * - Can start with any digit
 * 
 * B.I Angola:
 * - 9 digits
 * - Format: usually starts with specific patterns based on province
 */
export function validateNIFAO(nif: string): { valid: boolean; error?: string; type?: string } {
  // Remove spaces and dashes
  const cleanNif = nif.replace(/[\s-]/g, '')
  
  // NIF Angola: can be 10 digits (companies/individuals) or 9 digits (legacy B.I format)
  if (!/^\d{9,10}$/.test(cleanNif)) {
    return { valid: false, error: 'NIF/B.I deve ter 9 ou 10 dígitos' }
  }
  
  // Basic validation - Angola doesn't have a complex check digit algorithm like Portugal
  // But we can validate some basic rules
  
  // Check for obviously invalid numbers (all same digits)
  if (/^(\d)\1+$/.test(cleanNif)) {
    return { valid: false, error: 'NIF/B.I inválido' }
  }
  
  // Determine type based on length
  let type = ''
  if (cleanNif.length === 10) {
    type = 'NIF (Pessoa Coletiva/Singular)'
  } else {
    type = 'Bilhete de Identidade'
  }
  
  return { valid: true, type }
}

/**
 * Generic fiscal ID validator based on country
 */
export function validateFiscalId(
  fiscalId: string, 
  country: 'PT' | 'AO'
): { valid: boolean; error?: string; type?: string } {
  if (!fiscalId) {
    return { valid: false, error: 'Identificação fiscal é obrigatória' }
  }
  
  if (country === 'PT') {
    return validateNIFPT(fiscalId)
  } else if (country === 'AO') {
    return validateNIFAO(fiscalId)
  }
  
  return { valid: false, error: 'País não suportado' }
}

/**
 * Format NIF for display
 */
export function formatNIF(nif: string, country: 'PT' | 'AO'): string {
  const clean = nif.replace(/\D/g, '')
  
  if (country === 'PT' && clean.length === 9) {
    // Format: 123 456 789
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`
  } else if (country === 'AO') {
    if (clean.length === 10) {
      // Format: 1234567890 (NIF)
      return clean
    } else if (clean.length === 9) {
      // Format: 123456789 (B.I)
      return clean
    }
  }
  
  return nif
}

/**
 * Validate email
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Email é obrigatório' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Email inválido' }
  }
  
  return { valid: true }
}

/**
 * Validate phone number (Portugal/Angola)
 */
export function validatePhone(
  phone: string, 
  country: 'PT' | 'AO'
): { valid: boolean; error?: string } {
  if (!phone) {
    return { valid: true } // Phone is optional
  }
  
  const clean = phone.replace(/[\s-]/g, '')
  
  if (country === 'PT') {
    // Portuguese phone: 9 digits, starts with 9 (mobile) or 2 (landline)
    if (!/^(?:\+351)?[29]\d{8}$/.test(clean)) {
      return { valid: false, error: 'Telefone inválido (deve ter 9 dígitos e começar com 2 ou 9)' }
    }
  } else if (country === 'AO') {
    // Angolan phone: 9 digits, starts with 9 (mobile) or 2 (landline)
    if (!/^(?:\+244)?[29]\d{8}$/.test(clean)) {
      return { valid: false, error: 'Telefone inválido (deve ter 9 dígitos e começar com 2 ou 9)' }
    }
  }
  
  return { valid: true }
}

/**
 * Validate postal code
 */
export function validatePostalCode(
  postalCode: string,
  country: 'PT' | 'AO'
): { valid: boolean; error?: string } {
  if (!postalCode) {
    return { valid: true } // Postal code is optional
  }
  
  const clean = postalCode.replace(/\s/g, '')
  
  if (country === 'PT') {
    // Portuguese postal code: XXXX-XXX or XXXXXXX
    if (!/^\d{4}-?\d{3}$/.test(clean)) {
      return { valid: false, error: 'Código postal inválido (formato: 1234-567)' }
    }
  } else if (country === 'AO') {
    // Angolan postal codes are less standardized
    // Luanda: 1xxx, other provinces: varies
    if (!/^\d{4,6}$/.test(clean)) {
      return { valid: false, error: 'Código postal inválido' }
    }
  }
  
  return { valid: true }
}
