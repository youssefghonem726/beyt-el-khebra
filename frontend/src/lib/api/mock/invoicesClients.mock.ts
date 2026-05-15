// src/lib/api/mock/invoicesClients.mock.ts
// Mock for invoicesClientsSettingsService — reads from /public/data/json/

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
} from '../types'

const delay = (ms = 300): Promise<void> => new Promise((res) => setTimeout(res, ms))

const load = <T>(file: string): Promise<T> =>
  fetch(`/data/json/${file}.json`).then((res) => {
    if (!res.ok) throw new Error(`Mock: failed to load ${file}.json`)
    return res.json() as Promise<T>
  })

const wrap = <T>(data: T, message = 'OK'): AxiosResponse<ApiSuccess<T>> => ({
  data: { success: true, message, data },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as never,
})

// ─── Deliveries ──────────────────────────────────────────────────────────────

export const getDeliveries = async (): Promise<AxiosResponse<ApiSuccess<Delivery[]>>> => {
  await delay()
  return wrap(await load<Delivery[]>('deliveries'), 'Deliveries fetched successfully')
}

export const getDeliveryById = async (
  deliveryId: string
): Promise<AxiosResponse<ApiSuccess<Delivery>>> => {
  await delay()
  const data = await load<Delivery[]>('deliveries')
  const item = data.find((d) => d.id === deliveryId)
  if (!item) throw { response: { status: 404, data: { success: false, message: 'Delivery not found' } } }
  return wrap(item, 'Delivery fetched successfully')
}

export const updateDelivery = async (
  deliveryId: string,
  updates: Partial<Delivery>
): Promise<AxiosResponse<ApiSuccess<Delivery>>> => {
  await delay(400)
  console.log('[MOCK] updateDelivery', deliveryId, updates)
  return wrap({ id: deliveryId, ...updates } as Delivery)
}

export const markDelivered = async (
  deliveryId: string
): Promise<AxiosResponse<ApiSuccess<Delivery>>> => {
  await delay(400)
  console.log('[MOCK] markDelivered', deliveryId)
  return wrap({ id: deliveryId, status: 'delivered', progress: 100 } as Delivery)
}

export const rescheduleDelivery = async (
  deliveryId: string,
  payload: RescheduleDeliveryPayload
): Promise<AxiosResponse<ApiSuccess<Delivery>>> => {
  await delay(400)
  console.log('[MOCK] rescheduleDelivery', deliveryId, payload)
  return wrap({ id: deliveryId, status: 'scheduled', scheduledDate: payload.scheduledDate } as Delivery)
}

export const cancelDelivery = async (
  deliveryId: string,
  payload: CancelDeliveryPayload = {}
): Promise<AxiosResponse<ApiSuccess<Delivery>>> => {
  await delay(400)
  console.log('[MOCK] cancelDelivery', deliveryId, payload)
  return wrap({ id: deliveryId, status: 'on_hold' } as Delivery)
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export const getInvoices = async (): Promise<AxiosResponse<ApiSuccess<Invoice[]>>> => {
  await delay()
  return wrap(await load<Invoice[]>('invoices'), 'Invoices fetched successfully')
}

export const getInvoiceById = async (
  invoiceId: string
): Promise<AxiosResponse<ApiSuccess<Invoice>>> => {
  await delay()
  const data = await load<Invoice[]>('invoices')
  const item = data.find((i) => i.id === invoiceId)
  if (!item) throw { response: { status: 404, data: { success: false, message: 'Invoice not found' } } }
  return wrap(item, 'Invoice fetched successfully')
}

export const payInvoice = async (
  invoiceId: string,
  payload: PayInvoicePayload
): Promise<AxiosResponse<ApiSuccess<Pick<Invoice, 'id' | 'status' | 'paidDate'>>>> => {
  await delay(600)
  console.log('[MOCK] payInvoice', invoiceId, payload)
  return wrap({ id: invoiceId, status: 'paid' as const, paidDate: new Date().toISOString() })
}

export const downloadInvoice = async (invoiceId: string): Promise<AxiosResponse<Blob>> => {
  await delay(400)
  console.log('[MOCK] downloadInvoice', invoiceId)
  const blob = new Blob([`Mock PDF for invoice ${invoiceId}`], { type: 'application/pdf' })
  return { data: blob, status: 200, statusText: 'OK', headers: {}, config: {} as never }
}

// ─── Accounting ──────────────────────────────────────────────────────────────

export const getAccountingOverview = async (): Promise<AxiosResponse<ApiSuccess<AccountingOverview>>> => {
  await delay()
  const invoices = await load<Invoice[]>('invoices')
  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const totalOutstanding = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0)
  return wrap({ totalRevenue, totalOutstanding, invoiceCount: invoices.length })
}

export const getClientSummary = async (): Promise<AxiosResponse<ApiSuccess<ClientSummaryItem[]>>> => {
  await delay()
  const [invoices, clients] = await Promise.all([load<Invoice[]>('invoices'), load<Client[]>('clients')])
  const summary: ClientSummaryItem[] = clients.map((c) => ({
    clientId: c.id,
    name: c.name,
    totalSpent: c.stats.totalSpent,
    outstanding: invoices
      .filter((i) => i.clientId === c.id && i.status !== 'paid')
      .reduce((s, i) => s + i.amount, 0),
  }))
  return wrap(summary)
}

export const getRevenue = async (): Promise<AxiosResponse<ApiSuccess<Invoice[]>>> => {
  await delay()
  const invoices = await load<Invoice[]>('invoices')
  return wrap(invoices.filter((i) => i.status === 'paid'))
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export const getClients = async (
  params: GetClientsParams = {}
): Promise<AxiosResponse<ApiSuccess<PaginatedResponse<Client>>>> => {
  await delay()
  let data = await load<Client[]>('clients')
  const { q, page = 1, pageSize = 20 } = params

  if (q) {
    const lq = q.toLowerCase()
    data = data.filter(
      (c) => c.name.toLowerCase().includes(lq) || c.email.toLowerCase().includes(lq)
    )
  }

  const start = (page - 1) * pageSize
  return wrap({
    results: data.slice(start, start + pageSize),
    count: data.length,
    next: null,
    previous: null,
  })
}

export const getClientById = async (
  clientId: string
): Promise<AxiosResponse<ApiSuccess<Client>>> => {
  await delay()
  const data = await load<Client[]>('clients')
  const item = data.find((c) => c.id === clientId)
  if (!item) throw { response: { status: 404, data: { success: false, message: 'Client not found' } } }
  return wrap(item)
}

export const replaceClient = async (
  clientId: string,
  clientData: Omit<Client, 'id' | 'stats'>
): Promise<AxiosResponse<ApiSuccess<Client>>> => {
  await delay(400)
  console.log('[MOCK] replaceClient', clientId, clientData)
  return wrap({ id: clientId, ...clientData } as unknown as Client)
}

export const updateClient = async (
  clientId: string,
  updates: Partial<Client>
): Promise<AxiosResponse<ApiSuccess<Client>>> => {
  await delay(400)
  console.log('[MOCK] updateClient', clientId, updates)
  return wrap({ id: clientId, ...updates } as Client)
}

// ─── Notifications ───────────────────────────────────────────────────────────

export const getNotifications = async (): Promise<AxiosResponse<ApiSuccess<Notification[]>>> => {
  await delay()
  return wrap(await load<Notification[]>('notifications-owner'))
}

export const markNotificationRead = async (
  notificationId: number
): Promise<AxiosResponse<ApiSuccess<Notification>>> => {
  await delay(200)
  console.log('[MOCK] markNotificationRead', notificationId)
  return wrap({ id: notificationId, unread: false } as unknown as Notification)
}

export const updateNotification = async (
  notificationId: number,
  updates: UpdateNotificationPayload
): Promise<AxiosResponse<ApiSuccess<Notification>>> => {
  await delay(200)
  console.log('[MOCK] updateNotification', notificationId, updates)
  return wrap({ id: notificationId, ...updates } as unknown as Notification)
}

export const markAllNotificationsRead = async (): Promise<
  AxiosResponse<ApiSuccess<{ success: boolean }>>
> => {
  await delay(200)
  console.log('[MOCK] markAllNotificationsRead')
  return wrap({ success: true })
}

// ─── Support ─────────────────────────────────────────────────────────────────

export const createSupportTicket = async (
  payload: CreateTicketPayload
): Promise<AxiosResponse<ApiSuccess<SupportTicket>>> => {
  await delay(500)
  console.log('[MOCK] createSupportTicket', payload)
  return wrap({ id: String(Date.now()), ...payload, status: 'open' as const })
}

export const getSupportTickets = async (): Promise<AxiosResponse<ApiSuccess<SupportTicket[]>>> => {
  await delay()
  return wrap([] as SupportTicket[])
}

export const getSupportTicketById = async (
  ticketId: string
): Promise<AxiosResponse<ApiSuccess<SupportTicket>>> => {
  await delay()
  return wrap({ id: ticketId, subject: '', message: '', status: 'open' as const, messages: [] })
}

// ─── Settings ────────────────────────────────────────────────────────────────

export const getSettings = async (): Promise<AxiosResponse<ApiSuccess<AppSettings>>> => {
  await delay()
  const [pricing, users] = await Promise.all([
    load<PricingRule[]>('pricing'),
    load<UserProfile[]>('users'),
  ])
  return wrap({ pricing, users })
}

export const updatePricingSettings = async (
  payload: Partial<PricingRule> | PricingRule[]
): Promise<AxiosResponse<ApiSuccess<AppSettings>>> => {
  await delay(400)
  console.log('[MOCK] updatePricingSettings', payload)
  return wrap(payload as unknown as AppSettings)
}

export const updateWhatsappSettings = async (
  payload: WhatsappSettings
): Promise<AxiosResponse<ApiSuccess<WhatsappSettings>>> => {
  await delay(400)
  console.log('[MOCK] updateWhatsappSettings', payload)
  return wrap(payload)
}

export const getUsers = async (): Promise<AxiosResponse<ApiSuccess<UserProfile[]>>> => {
  await delay()
  return wrap(await load<UserProfile[]>('users'))
}

export const updateUser = async (
  email: string,
  updates: Partial<UserProfile>
): Promise<AxiosResponse<ApiSuccess<UserProfile>>> => {
  await delay(400)
  console.log('[MOCK] updateUser', email, updates)
  return wrap({ email, ...updates } as unknown as UserProfile)
}
