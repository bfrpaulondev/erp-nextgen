/**
 * Global TypeScript Types for ERP Next-Gen
 */

// ===========================================
// Enums
// ===========================================

export enum Country {
  PORTUGAL = 'PT',
  ANGOLA = 'AO',
}

export enum Currency {
  EUR = 'EUR',
  AOA = 'AOA',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ACCOUNTANT = 'ACCOUNTANT',
  USER = 'USER',
}

export enum PartyType {
  CUSTOMER = 'CUSTOMER',
  SUPPLIER = 'SUPPLIER',
  BOTH = 'BOTH',
}

export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum ItemType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

export enum InvoiceType {
  INVOICE = 'INVOICE',
  INVOICE_RECEIPT = 'INVOICE_RECEIPT',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  RECEIPT = 'RECEIPT',
  QUOTE = 'QUOTE',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD = 'CARD',
  CHECK = 'CHECK',
  OTHER = 'OTHER',
}

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
}

// ===========================================
// DTO Types (Data Transfer Objects)
// ===========================================

export interface CompanyDTO {
  id: string
  name: string
  nif: string
  country: Country
  currency: Currency
  logo?: string
  address?: string
  city?: string
  phone?: string
  email?: string
  website?: string
  settings?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface UserDTO {
  id: string
  email: string
  name: string | null
  image: string | null
  role: UserRole
  isActive: boolean
  companyId: string
  createdAt: Date
  updatedAt: Date
  lastLogin: Date | null
}

export interface PartyDTO {
  id: string
  name: string
  fiscalId: string | null
  type: PartyType
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  postalCode: string | null
  country: string | null
  notes: string | null
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface ChartOfAccountDTO {
  id: string
  code: string
  name: string
  type: AccountType
  category: string | null
  parentCode: string | null
  isActive: boolean
  description: string | null
  companyId: string
  createdAt: Date
  updatedAt: Date
}

// Alias for backward compatibility
export type AccountDTO = ChartOfAccountDTO

export interface ItemDTO {
  id: string
  code: string
  name: string
  description: string | null
  type: ItemType
  unit: string
  price: number
  cost: number | null
  stock: number | null
  minStock: number | null
  image: string | null
  isActive: boolean
  taxRateId: string | null
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface TaxRateDTO {
  id: string
  name: string
  code: string
  rate: number
  country: Country
  description: string | null
  isActive: boolean
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface DocumentSeriesDTO {
  id: string
  type: InvoiceType
  prefix: string
  name: string
  currentNumber: number
  year: number
  isActive: boolean
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceDTO {
  id: string
  number: string
  series: string
  seriesId: string | null
  type: InvoiceType
  status: InvoiceStatus
  date: Date
  dueDate: Date | null
  notes: string | null
  internalNotes: string | null
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  customerName: string
  customerFiscalId: string | null
  customerAddress: string | null
  customerId: string | null
  companyId: string
  createdById: string | null
  createdAt: Date
  updatedAt: Date
  lines: InvoiceLineItemDTO[]
}

export interface InvoiceLineItemDTO {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  taxRate: number
  taxAmount: number
  total: number
  invoiceId: string
  itemId: string | null
  taxRateId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PaymentDTO {
  id: string
  number: string
  date: Date
  amount: number
  method: PaymentMethod
  reference: string | null
  notes: string | null
  invoiceId: string | null
  customerId: string | null
  companyId: string
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}

export interface LedgerEntryDTO {
  id: string
  date: Date
  description: string
  debit: number
  credit: number
  sourceType: string | null
  sourceId: string | null
  accountId: string
  companyId: string
  invoiceId: string | null
  paymentId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface StockMovementDTO {
  id: string
  type: StockMovementType
  quantity: number
  reference: string | null
  notes: string | null
  itemId: string
  sourceType: string | null
  sourceId: string | null
  companyId: string
  createdAt: Date
  updatedAt: Date
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ===========================================
// Form Types
// ===========================================

export interface LoginForm {
  email: string
  password: string
}

export interface RegisterForm {
  name: string
  email: string
  password: string
  confirmPassword: string
  companyName: string
  companyNif: string
  country: Country
}

export interface CompanyOnboardingForm {
  name: string
  nif: string
  country: Country
  address?: string
  city?: string
  phone?: string
  email?: string
}

export interface InvoiceForm {
  customerId: string
  date: Date
  dueDate?: Date
  notes?: string
  lines: InvoiceLineForm[]
}

export interface InvoiceLineForm {
  itemId?: string
  description: string
  quantity: number
  unitPrice: number
  discount?: number
  taxRateId?: string
}

// ===========================================
// Dashboard Types
// ===========================================

export interface DashboardStats {
  totalRevenue: number
  totalExpenses: number
  pendingInvoices: number
  overdueInvoices: number
  totalCustomers: number
  totalSuppliers: number
  lowStockItems: number
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
  }[]
}

// ===========================================
// Session/Context Types
// ===========================================

export interface UserSession {
  id: string
  email: string
  name: string | null
  role: UserRole
  companyId: string
  company: {
    id: string
    name: string
    nif: string
    country: Country
    currency: Currency
  }
}

export interface AppContext {
  user: UserSession | null
  company: CompanyDTO | null
}
