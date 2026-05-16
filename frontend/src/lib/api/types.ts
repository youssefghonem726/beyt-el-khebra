export interface ApiSuccess<T> {
  success: true
  message: string
  data: T
}

export interface ApiError {
  success: false
  message: string
  errors: Record<string, unknown>
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  results: T[]
  count: number
  next: string | null
  previous: string | null
}

// ─── Auth / Users ─────────────────────────────────────────────────────────────

export type UserRole = 'client' | 'manager' | 'owner' | 'production'

export interface UserProfile {
  id: number
  supabase_uid: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  role: UserRole
  is_active: boolean
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface SignupProfileData {
  first_name?: string
  last_name?: string
  phone?: string
  role?: UserRole
  [key: string]: unknown
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalOrders: number
  activeJobs: number
  unpricedOrders: number
  accountingItems: number
  totalRevenue: number
  pendingOrders: number
  completedOrders: number
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'UNPRICED_PENDING'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'DELIVERED'
  | 'CANCELED'

export interface Order {
  id: number
  status: OrderStatus
  quantity: number
  total_price: string
  customer: number
  approved_by: number | null
}

export interface CreateOrderPayload {
  status?: OrderStatus
  quantity: number
  total_price: number
}

export interface UpdateOrderPayload {
  status?: OrderStatus
  quantity?: number
  total_price?: number
}

export interface GetOrdersParams {
  page?: number
  status?: OrderStatus
  q?: string
}

export interface OrderStatusHistory {
  id: number
  orderId: number
  status: OrderStatus
  changedAt: string
  changedBy?: number
  note?: string
}

// ─── Uploads ──────────────────────────────────────────────────────────────────

export type UploadFileType =
  | 'cover'
  | 'content'
  | 'preview'
  | 'package_image'

export interface Upload {
  id: number
  url: string
  file_type: UploadFileType
  uploaded_by: number
}

export interface CreateUploadPayload {
  file: File
  file_type: UploadFileType
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export type QuoteStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'converted'

export interface QuoteItem {
  id?: number
  item_type: string
  quantity: number
  estimated_unit_price: number
  estimated_total_price: number
  notes?: string
}

export interface Quote {
  id: number
  order_id: number
  status: string
  total_estimated_price: number
  notes?: string
  items: QuoteItem[]
}

export interface SubmitQuotePayload {
  order_id: number
  status?: string
  total_estimated_price?: number
  notes?: string
  items: Omit<QuoteItem, 'id'>[]
}

export interface QuoteChangeRequest {
  notes: string
}

export interface ApproveQuoteResponse {
  quote: Pick<Quote, 'id' | 'status'>
  order: Order
}

// ─── Batches ──────────────────────────────────────────────────────────────────

export type BatchStatus =
  | 'in_progress'
  | 'finishing'
  | 'completed'
  | 'canceled'
  | 'pending_approval'
  | 'unpriced'

export interface BatchStage {
  stage: 'Prepress' | 'Printing' | 'Finishing'
  status: 'done' | 'in_progress' | 'waiting' | 'pending' | 'not_started'
  updatedAt: string | null
}

export interface Batch {
  id: string
  orderId: string
  clientId: string
  product: string
  qty: number
  progress: number
  priority: 'Normal' | 'High' | 'Medium'
  assignedTo: string | null
  deadline: string | null
  status: BatchStatus
  stages: BatchStage[]
  notes: string
}

export interface GetBatchesParams {
  status?: 'ACTIVE' | 'COMPLETED' | string
  q?: string
}

export interface UpdateBatchProgressPayload {
  progress: number
}

export interface UpdateBatchStagePayload {
  status: BatchStage['status']
  updatedAt?: string
}

export interface UpdateBatchAssignmentsPayload {
  assignedTo: string
}

// ─── Deliveries ───────────────────────────────────────────────────────────────

export type DeliveryStatus =
  | 'scheduled'
  | 'in_transit'
  | 'on_time'
  | 'delayed'
  | 'delivered'
  | 'lost_in_transit'
  | 'on_hold'

export interface Delivery {
  id: string
  orderId: string
  clientId: string
  address: string
  driver: string
  company: string
  phone: string
  status: DeliveryStatus
  progress: number
  scheduledDate: string
}

export interface RescheduleDeliveryPayload {
  scheduledDate: string
  reason?: string
}

export interface CancelDeliveryPayload {
  reason?: string
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export type InvoiceStatus = 'paid' | 'pending' | 'unpaid' | 'overdue'

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
}

export interface Invoice {
  id: string
  orderId: string
  clientId: string
  issued: string
  due: string
  paidDate: string | null
  amount: number
  status: InvoiceStatus
  vatRate: number
  items: InvoiceItem[]
  notes: string
}

export interface PayInvoicePayload {
  paymentMethodId?: string
  [key: string]: unknown
}

// ─── Accounting ───────────────────────────────────────────────────────────────

export interface AccountingOverview {
  totalRevenue: number
  totalOutstanding: number
  invoiceCount: number
}

export interface ClientSummaryItem {
  clientId: string
  name: string
  totalSpent: number
  outstanding: number
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export interface ClientStats {
  totalOrders: number
  totalSpent: number
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  taxId: string
  since: string | null
  stats: ClientStats
}

export interface GetClientsParams {
  page?: number
  pageSize?: number
  q?: string
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationAction {
  label: string
  page: string
}

export interface Notification {
  id: number
  title: string
  time: string
  body: string
  unread: boolean
  action: NotificationAction
}

export interface UpdateNotificationPayload {
  read?: boolean
  [key: string]: unknown
}

// ─── Support ──────────────────────────────────────────────────────────────────

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface SupportMessage {
  id: string
  body: string
  sender: string
  createdAt: string
}

export interface SupportTicket {
  id: string
  subject: string
  message: string
  orderId?: string
  status: TicketStatus
  messages?: SupportMessage[]
}

export interface CreateTicketPayload {
  subject: string
  message: string
  orderId?: string
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface PricingRule {
  id: string
  product: string
  size: string
  paper: string
  pricePerUnit: number
  minQty: number
  active: boolean
}

export interface WhatsappSettings {
  phoneNumberId?: string
  accessToken?: string
  webhookVerifyToken?: string
  [key: string]: unknown
}

export interface AppSettings {
  pricing: PricingRule[]
  users: UserProfile[]
}