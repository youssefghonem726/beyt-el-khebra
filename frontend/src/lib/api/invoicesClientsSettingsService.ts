// src/lib/api/invoicesClientsSettingsService.ts
import api from './axiosInstance'
import type { AxiosResponse } from 'axios'
import type {
  ApiSuccess,
  Delivery,
  RescheduleDeliveryPayload,
  CancelDeliveryPayload,
  Invoice,
  PayInvoicePayload,
  AccountingOverview,
  ClientSummaryItem,
  Client,
  GetClientsParams,
  PaginatedResponse,
  Notification,
  UpdateNotificationPayload,
  SupportTicket,
  CreateTicketPayload,
  AppSettings,
  PricingRule,
  WhatsappSettings,
  UserProfile,
} from './types'

// ─── Deliveries ──────────────────────────────────────────────────────────────
// @pending — not yet implemented in Django

export const getDeliveries = (): Promise<AxiosResponse<ApiSuccess<Delivery[]>>> =>
  api.get('/api/deliveries/')

export const getDeliveryById = (
  deliveryId: string
): Promise<AxiosResponse<ApiSuccess<Delivery>>> =>
  api.get(`/api/deliveries/${deliveryId}/`)

export const updateDelivery = (
  deliveryId: string,
  updates: Partial<Delivery>
): Promise<AxiosResponse<ApiSuccess<Delivery>>> =>
  api.patch(`/api/deliveries/${deliveryId}/`, updates)

export const markDelivered = (
  deliveryId: string
): Promise<AxiosResponse<ApiSuccess<Delivery>>> =>
  api.post(`/api/deliveries/${deliveryId}/mark-delivered/`)

export const rescheduleDelivery = (
  deliveryId: string,
  payload: RescheduleDeliveryPayload
): Promise<AxiosResponse<ApiSuccess<Delivery>>> =>
  api.post(`/api/deliveries/${deliveryId}/reschedule/`, payload)

export const cancelDelivery = (
  deliveryId: string,
  payload: CancelDeliveryPayload = {}
): Promise<AxiosResponse<ApiSuccess<Delivery>>> =>
  api.post(`/api/deliveries/${deliveryId}/cancel/`, payload)

// ─── Invoices ────────────────────────────────────────────────────────────────
// @pending — not yet implemented in Django

export const getInvoices = (): Promise<AxiosResponse<ApiSuccess<Invoice[]>>> =>
  api.get('/api/invoices/')

export const getInvoiceById = (
  invoiceId: string
): Promise<AxiosResponse<ApiSuccess<Invoice>>> =>
  api.get(`/api/invoices/${invoiceId}/`)

export const payInvoice = (
  invoiceId: string,
  paymentPayload: PayInvoicePayload
): Promise<AxiosResponse<ApiSuccess<Pick<Invoice, 'id' | 'status' | 'paidDate'>>>> =>
  api.post(`/api/invoices/${invoiceId}/pay/`, paymentPayload)

/** Returns a PDF blob — caller handles the browser download trigger */
export const downloadInvoice = (
  invoiceId: string
): Promise<AxiosResponse<Blob>> =>
  api.get(`/api/invoices/${invoiceId}/download/`, { responseType: 'blob' })

// ─── Accounting ──────────────────────────────────────────────────────────────
// @pending — not yet implemented in Django

export const getAccountingOverview = (): Promise<AxiosResponse<ApiSuccess<AccountingOverview>>> =>
  api.get('/api/accounting/overview/')

export const getClientSummary = (): Promise<AxiosResponse<ApiSuccess<ClientSummaryItem[]>>> =>
  api.get('/api/accounting/client-summary/')

export const getRevenue = (): Promise<AxiosResponse<ApiSuccess<Invoice[]>>> =>
  api.get('/api/accounting/revenue/')

// ─── Clients ─────────────────────────────────────────────────────────────────
// @pending — not yet implemented in Django

export const getClients = (
  params: GetClientsParams = {}
): Promise<AxiosResponse<ApiSuccess<PaginatedResponse<Client>>>> => {
  const { page = 1, pageSize = 20, q } = params
  const query: Record<string, unknown> = { page, pageSize }
  if (q) query.q = q
  return api.get('/api/clients/', { params: query })
}

export const getClientById = (
  clientId: string
): Promise<AxiosResponse<ApiSuccess<Client>>> =>
  api.get(`/api/clients/${clientId}/details/`)

export const replaceClient = (
  clientId: string,
  clientData: Omit<Client, 'id' | 'stats'>
): Promise<AxiosResponse<ApiSuccess<Client>>> =>
  api.put(`/api/clients/${clientId}/`, clientData)

export const updateClient = (
  clientId: string,
  updates: Partial<Client>
): Promise<AxiosResponse<ApiSuccess<Client>>> =>
  api.patch(`/api/clients/${clientId}/`, updates)

// ─── Notifications ───────────────────────────────────────────────────────────
// @pending — not yet implemented in Django

export const getNotifications = (): Promise<AxiosResponse<ApiSuccess<Notification[]>>> =>
  api.get('/api/notifications/')

/** PATCH /api/notifications/<id>/read — marks single notification as read */
export const markNotificationRead = (
  notificationId: number
): Promise<AxiosResponse<ApiSuccess<Notification>>> =>
  api.patch(`/api/notifications/${notificationId}/read/`)

/** PATCH /api/notifications/<id>/ — general field update */
export const updateNotification = (
  notificationId: number,
  updates: UpdateNotificationPayload
): Promise<AxiosResponse<ApiSuccess<Notification>>> =>
  api.patch(`/api/notifications/${notificationId}/`, updates)

export const markAllNotificationsRead = (): Promise<
  AxiosResponse<ApiSuccess<{ success: boolean }>>
> => api.patch('/api/notifications/read-all/')

// ─── Support ─────────────────────────────────────────────────────────────────
// @pending — not yet implemented in Django

export const createSupportTicket = (
  ticketData: CreateTicketPayload
): Promise<AxiosResponse<ApiSuccess<SupportTicket>>> =>
  api.post('/api/support/tickets/', ticketData)

export const getSupportTickets = (): Promise<AxiosResponse<ApiSuccess<SupportTicket[]>>> =>
  api.get('/api/support/tickets/')

export const getSupportTicketById = (
  ticketId: string
): Promise<AxiosResponse<ApiSuccess<SupportTicket>>> =>
  api.get(`/api/support/tickets/${ticketId}/`)

// ─── Settings ────────────────────────────────────────────────────────────────
// @pending — not yet implemented in Django

export const getSettings = (): Promise<AxiosResponse<ApiSuccess<AppSettings>>> =>
  api.get('/api/settings/')

export const updatePricingSettings = (
  pricingData: Partial<PricingRule> | PricingRule[]
): Promise<AxiosResponse<ApiSuccess<AppSettings>>> =>
  api.patch('/api/settings/pricing/', pricingData)

export const updateWhatsappSettings = (
  whatsappData: WhatsappSettings
): Promise<AxiosResponse<ApiSuccess<WhatsappSettings>>> =>
  api.patch('/api/settings/whatsapp/', whatsappData)

export const getUsers = (): Promise<AxiosResponse<ApiSuccess<UserProfile[]>>> =>
  api.get('/api/users/')

/**
 * PATCH /api/users/<email>/ — Django uses email as the lookup field, not id.
 */
export const updateUser = (
  email: string,
  updates: Partial<UserProfile>
): Promise<AxiosResponse<ApiSuccess<UserProfile>>> =>
  api.patch(`/api/users/${email}/`, updates)
