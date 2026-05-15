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
// GET /api/dashboard/stats/ — confirmed in DONE.docx, not yet tested

export const getDashboardStats = (): Promise<AxiosResponse<ApiSuccess<DashboardStats>>> =>
  api.get('/api/dashboard/stats/')

// ─── Orders ──────────────────────────────────────────────────────────────────
// All confirmed tested: CRUD on /api/orders/

/**
 * GET /api/orders/ — returns all orders for the authenticated user.
 * Ownership enforced server-side: users only see their own orders.
 */
export const getOrders = (
  params: GetOrdersParams = {}
): Promise<AxiosResponse<ApiSuccess<Order[]>>> => {
  const query: Record<string, unknown> = {}
  if (params.page) query.page = params.page
  if (params.status) query.status = params.status
  if (params.q) query.q = params.q
  return api.get('/api/orders/', { params: query })
}

// Convenience wrappers
export const getMyOrders = () => getOrders()
export const getOrdersInProduction = () => getOrders({ status: 'IN_PRODUCTION' })
export const getOrdersPendingQuote = () => getOrders({ status: 'UNPRICED_PENDING' })
export const getUnpricedQueue = () => getOrders({ status: 'UNPRICED_PENDING' })
export const searchOrders = (q: string) => getOrders({ q })

/** GET /api/orders/<id>/ — confirmed tested */
export const getOrderById = (
  orderId: number
): Promise<AxiosResponse<ApiSuccess<Order>>> =>
  api.get(`/api/orders/${orderId}/`)

/**
 * POST /api/orders/ — confirmed tested.
 * Required fields: quantity, total_price. status defaults to UNPRICED_PENDING.
 * customer is set automatically from the JWT on the server.
 */
export const createOrder = (
  orderData: CreateOrderPayload
): Promise<AxiosResponse<ApiSuccess<Order>>> =>
  api.post('/api/orders/', orderData)

/**
 * PUT /api/orders/<id>/ — confirmed tested (full replace).
 * Use updateOrder for partial updates if backend supports PATCH.
 */
export const replaceOrder = (
  orderId: number,
  orderData: UpdateOrderPayload
): Promise<AxiosResponse<ApiSuccess<Order>>> =>
  api.put(`/api/orders/${orderId}/`, orderData)

/**
 * PATCH /api/orders/<id>/ — confirmed in DONE.docx.
 * Partial update — only send fields you want to change.
 */
export const updateOrder = (
  orderId: number,
  updates: UpdateOrderPayload
): Promise<AxiosResponse<ApiSuccess<Order>>> =>
  api.patch(`/api/orders/${orderId}/`, updates)

/** DELETE /api/orders/<id>/ — confirmed tested */
export const deleteOrder = (
  orderId: number
): Promise<AxiosResponse<ApiSuccess<Record<string, never>>>> =>
  api.delete(`/api/orders/${orderId}/`)

/**
 * GET /api/orders/<id>/history/ — backend logic done, endpoint not yet built.
 * Catch 404 in your component until this is added to Django.
 */
export const getOrderHistory = (
  orderId: number
): Promise<AxiosResponse<ApiSuccess<OrderStatusHistory[]>>> =>
  api.get(`/api/orders/${orderId}/history/`)

// ─── Quotes ──────────────────────────────────────────────────────────────────
// NOT YET IMPLEMENTED on backend. These are ready for when Django adds them.
// All marked with @pending so you can search for them easily.

/** @pending GET /api/quotes/ */
export const getQuotes = (): Promise<AxiosResponse<ApiSuccess<Quote[]>>> =>
  api.get('/api/quotes/')

/** @pending GET /api/quotes/<id>/ */
export const getQuoteById = (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<Quote>>> =>
  api.get(`/api/quotes/${quoteId}/`)

/** @pending POST /api/quotes/ */
export const createQuote = (
  quoteData: SubmitQuotePayload & { orderId: number }
): Promise<AxiosResponse<ApiSuccess<Quote>>> =>
  api.post('/api/quotes/', quoteData)

/** @pending PATCH /api/quotes/<id>/ */
export const updateQuote = (
  quoteId: number,
  updates: Partial<Quote>
): Promise<AxiosResponse<ApiSuccess<Quote>>> =>
  api.patch(`/api/quotes/${quoteId}/`, updates)

/** @pending DELETE /api/quotes/<id>/ */
export const deleteQuote = (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<Record<string, never>>>> =>
  api.delete(`/api/quotes/${quoteId}/`)

/**
 * @pending POST /api/quotes/<id>/approve/
 * Converts quote to order automatically on approval.
 */
export const approveQuote = (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<ApproveQuoteResponse>>> =>
  api.post(`/api/quotes/${quoteId}/approve/`)

/** @pending POST /api/quotes/<id>/confirm/ (client-side confirmation) */
export const confirmQuote = (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<Pick<Quote, 'id' | 'status'>>>> =>
  api.post(`/api/quotes/${quoteId}/confirm/`)

/** @pending POST /api/quotes/<id>/request-changes/ */
export const requestQuoteChanges = (
  quoteId: number,
  changeRequest: QuoteChangeRequest
): Promise<AxiosResponse<ApiSuccess<Pick<Quote, 'id' | 'status'>>>> =>
  api.post(`/api/quotes/${quoteId}/request-changes/`, changeRequest)

/** @pending POST /api/orders/<id>/quote/ — submit a quote from unpriced queue */
export const submitQuoteForOrder = (
  orderId: number,
  quoteData: SubmitQuotePayload
): Promise<AxiosResponse<ApiSuccess<Quote>>> =>
  api.post(`/api/orders/${orderId}/quote/`, quoteData)
