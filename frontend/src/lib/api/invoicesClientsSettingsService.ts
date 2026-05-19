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
  PricingRoleSettings,
  WhatsappSettings,
  UserProfile,
} from './types'

export type { Client } from './types'

// ─── Deliveries ──────────────────────────────────────────────────────────────

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

export const downloadInvoice = (
  invoiceId: string
): Promise<AxiosResponse<Blob>> =>
  api.get(`/api/invoices/${invoiceId}/download/`, { responseType: 'blob' })

// ─── Accounting ──────────────────────────────────────────────────────────────

export const getAccountingOverview = (): Promise<AxiosResponse<ApiSuccess<AccountingOverview>>> =>
  api.get('/api/accounting/overview/')

export const getClientSummary = (): Promise<AxiosResponse<ApiSuccess<ClientSummaryItem[]>>> =>
  api.get('/api/accounting/client-summary/')

export const getRevenue = (): Promise<AxiosResponse<ApiSuccess<Invoice[]>>> =>
  api.get('/api/accounting/revenue/')

// ─── Clients ─────────────────────────────────────────────────────────────────

export const getClients = async (
  params: GetClientsParams = {}
): Promise<AxiosResponse<ApiSuccess<PaginatedResponse<Client>>>> => {
  const { q } = params
  const query: Record<string, unknown> = {}

  if (q) query.q = q

  const response = await api.get<ApiSuccess<UserProfile[]>>('/api/users/clients/', {
    params: query,
  })

  const users = response.data.data

  const clients: Client[] = users.map((u) => ({
    id: String(u.id),
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
    email: u.email,
    phone: u.phone ?? '',
    address: u.address ?? '',
    taxId: '',
    since: u.created_at ?? null,
    stats: {
      totalOrders: 0,
      totalSpent: 0,
    },
  }))

  return {
    ...response,
    data: {
      ...response.data,
      data: {
        results: clients,
        count: clients.length,
        next: null,
        previous: null,
      },
    },
  }
}

export const createClientUser = (data: {
  first_name: string
  last_name: string
  email: string
  phone?: string
}): Promise<AxiosResponse<ApiSuccess<UserProfile>>> =>
  api.post('/api/users/clients/', data)

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

export const getNotifications = (): Promise<AxiosResponse<ApiSuccess<Notification[]>>> =>
  api.get('/api/notifications/')

export const markNotificationRead = (
  notificationId: number
): Promise<AxiosResponse<ApiSuccess<Notification>>> =>
  api.patch(`/api/notifications/${notificationId}/read/`)

export const updateNotification = (
  notificationId: number,
  updates: UpdateNotificationPayload
): Promise<AxiosResponse<ApiSuccess<Notification>>> =>
  api.patch(`/api/notifications/${notificationId}/`, updates)

export const markAllNotificationsRead = (): Promise<
  AxiosResponse<ApiSuccess<{ success: boolean }>>
> => api.patch('/api/notifications/read-all/')

// ─── Support ─────────────────────────────────────────────────────────────────

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

export const getSettings = (): Promise<AxiosResponse<ApiSuccess<AppSettings>>> =>
  api.get('/api/settings/')

export const updatePricingSettings = (
  pricingData: Partial<PricingRule> | PricingRule[]
): Promise<AxiosResponse<ApiSuccess<AppSettings>>> =>
  api.patch('/api/settings/pricing/', pricingData)

export const updatePricingRolesSettings = (
  pricingRolesData: PricingRoleSettings
): Promise<AxiosResponse<ApiSuccess<{ key: string; value: PricingRoleSettings }>>> =>
  api.patch('/api/settings/pricing-roles/', pricingRolesData)

export const updateWhatsappSettings = (
  whatsappData: WhatsappSettings
): Promise<AxiosResponse<ApiSuccess<{ key: string; value: WhatsappSettings }>>> =>
  api.patch('/api/settings/whatsapp/', whatsappData)

// ─── Users Management ────────────────────────────────────────────────────────
// Permanent backend endpoints:
// GET   /api/users/
// PATCH /api/users/<id>/

export const getUsers = (): Promise<AxiosResponse<ApiSuccess<UserProfile[]>>> =>
  api.get('/api/users/')

export const updateUser = (
  userId: number,
  updates: Partial<UserProfile>
): Promise<AxiosResponse<ApiSuccess<UserProfile>>> =>
  api.patch(`/api/users/${userId}/`, updates)
