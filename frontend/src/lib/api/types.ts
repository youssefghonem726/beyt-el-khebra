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
// DRF default pagination shape (add if/when backend paginates)

export interface PaginatedResponse<T> {
  results: T[]
  count: number
  next: string | null
  previous: string | null
}

// ─── Auth / Users ─────────────────────────────────────────────────────────────
// Shape from GET /api/users/me/  → data field

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
// GET /api/dashboard/stats/ — not yet implemented, shape is speculative

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
// Shape from POST /api/orders/ → data field

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
  total_price: string          // backend returns as decimal string e.g. "150.00"
  customer: number             // user id
  approved_by: number | null   // user id or null
}

export interface CreateOrderPayload {
  status?: OrderStatus
  quantity: number
  total_price: number
  customer_id?: number
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

// Order history — endpoint not yet implemented, shape is speculative
export interface OrderStatusHistory {
  id: number
  orderId: number
  status: OrderStatus
  changedAt: string
  changedBy?: number
  note?: string
}

// ─── Uploads ──────────────────────────────────────────────────────────────────
// Shape from POST /api/uploads/ → data field

export type UploadFileType =
  | 'cover'
  | 'content'
  | 'preview'
  | 'package_image'

export interface Upload {
  id: number
  url: string                  // e.g. "/media/uploads/example.pdf"
  file_type: UploadFileType
  uploaded_by: number          // user id
}

// POST /api/uploads/ uses multipart/form-data — NOT JSON
// Use FormData in the service, not a plain object
export interface CreateUploadPayload {
  file: File
  file_type: UploadFileType
}

// ─── Quotes ───────────────────────────────────────────────────────────────────
// Not yet confirmed in backend contract — shape is speculative
// Update when Django quotes endpoints are implemented

export type QuoteStatus =
  | 'Awaiting Confirmation'
  | 'Approved'
  | 'Changes Requested'
  | 'Rejected'

export interface QuoteItem {
  id?: number
  description: string
  qty: number
  unitPrice: number
  subtotal?: number
}

export interface Quote {
  id: number
  orderId: number
  clientId: number
  status: QuoteStatus
  vatRate: number
  validUntil?: string
  invoiceId?: number
  items: QuoteItem[]
  notes: string
}

export interface SubmitQuotePayload {
  vatRate?: number
  items: Omit<QuoteItem, 'id' | 'subtotal'>[]
  notes?: string
  validUntil?: string
}

export interface QuoteChangeRequest {
  notes: string
}

export interface ApproveQuoteResponse {
  quote: Pick<Quote, 'id' | 'status'>
  order: Order
}

// ─── Batches ──────────────────────────────────────────────────────────────────
// Not yet confirmed — shape is speculative

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
// Not yet confirmed — shape is speculative

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
// Not yet confirmed — shape is speculative

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
// Not yet confirmed — shape is speculative

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
// Not yet confirmed — shape is speculative

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
// Not yet confirmed — shape is speculative

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
// Not yet confirmed — shape is speculative

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
// Not yet confirmed — shape is speculative

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
