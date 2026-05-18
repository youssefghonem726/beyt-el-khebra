// src/lib/api/ordersQuotesService.ts
import api from './axiosInstance'
import type { AxiosResponse } from 'axios'
import type {
  ApiSuccess,
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  GetOrdersParams,
  OrderStatusHistory,
  DashboardStats,
  Quote,
  SubmitQuotePayload,
  QuoteChangeRequest,
  ApproveQuoteResponse,
} from './types'

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboardStats = (): Promise<AxiosResponse<ApiSuccess<DashboardStats>>> =>
  api.get('/api/dashboard/stats/')

// ─── Orders ──────────────────────────────────────────────────────────────────

export const getOrders = (
  params: GetOrdersParams = {}
): Promise<AxiosResponse<ApiSuccess<Order[]>>> => {
  const query: Record<string, unknown> = {}
  if (params.page) query.page = params.page
  if (params.status) query.status = params.status
  if (params.q) query.q = params.q
  return api.get('/api/orders/', { params: query })
}

export const getMyOrders = () => getOrders()
export const getOrdersInProduction = () => getOrders({ status: 'IN_PRODUCTION' })
export const getOrdersPendingQuote = () => getOrders({ status: 'UNPRICED_PENDING' })
export const getUnpricedQueue = () => getOrders({ status: 'UNPRICED_PENDING' })
export const searchOrders = (q: string) => getOrders({ q })

export const getProductionJobs = (
  params: { q?: string; step?: string } = {}
): Promise<AxiosResponse<ApiSuccess<any[]>>> =>
  api.get('/api/orders/production/', { params })

export const updateProductionJob = (
  itemId: number | string,
  updates: { current_step?: string; completed_quantity?: number }
): Promise<AxiosResponse<ApiSuccess<any>>> =>
  api.patch(`/api/orders/production-items/${itemId}/`, updates)

export const getOrderById = (
  orderId: number | string
): Promise<AxiosResponse<ApiSuccess<Order>>> =>
  api.get(`/api/orders/${orderId}/`)

export const createOrder = (
  orderData: CreateOrderPayload
): Promise<AxiosResponse<ApiSuccess<Order>>> =>
  api.post('/api/orders/', orderData)

export const replaceOrder = (
  orderId: number | string,
  orderData: UpdateOrderPayload
): Promise<AxiosResponse<ApiSuccess<Order>>> =>
  api.put(`/api/orders/${orderId}/`, orderData)

export const updateOrder = (
  orderId: number | string,
  updates: UpdateOrderPayload
): Promise<AxiosResponse<ApiSuccess<Order>>> =>
  api.patch(`/api/orders/${orderId}/`, updates)

export const deleteOrder = (
  orderId: number | string
): Promise<AxiosResponse<ApiSuccess<Record<string, never>>>> =>
  api.delete(`/api/orders/${orderId}/`)

export const getOrderHistory = (
  orderId: number | string
): Promise<AxiosResponse<ApiSuccess<OrderStatusHistory[]>>> =>
  api.get(`/api/orders/${orderId}/history/`)

// ─── Quotes ──────────────────────────────────────────────────────────────────

export const getQuotes = (): Promise<AxiosResponse<ApiSuccess<Quote[]>>> =>
  api.get('/api/quotes/')

export const getQuoteById = (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<Quote>>> =>
  api.get(`/api/quotes/${quoteId}/`)

export const createQuote = (
  quoteData: SubmitQuotePayload & { orderId: number }
): Promise<AxiosResponse<ApiSuccess<Quote>>> =>
  api.post('/api/quotes/', quoteData)

export const updateQuote = (
  quoteId: number,
  updates: Partial<Quote>
): Promise<AxiosResponse<ApiSuccess<Quote>>> =>
  api.patch(`/api/quotes/${quoteId}/`, updates)

export const deleteQuote = (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<Record<string, never>>>> =>
  api.delete(`/api/quotes/${quoteId}/`)

export const approveQuote = (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<ApproveQuoteResponse>>> =>
  api.post(`/api/quotes/${quoteId}/approve/`)

export const confirmQuote = (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<Pick<Quote, 'id' | 'status'>>>> =>
  api.post(`/api/quotes/${quoteId}/confirm/`)

export const requestQuoteChanges = (
  quoteId: number,
  changeRequest: QuoteChangeRequest
): Promise<AxiosResponse<ApiSuccess<Pick<Quote, 'id' | 'status'>>>> =>
  api.post(`/api/quotes/${quoteId}/request-changes/`, changeRequest)

export const submitQuoteForOrder = (
  _orderId: number,
  quoteData: any
): Promise<AxiosResponse<ApiSuccess<Quote>>> =>
  api.post('/api/quotes/', quoteData)
