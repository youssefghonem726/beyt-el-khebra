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

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const getDashboardStats = async (): Promise<AxiosResponse<ApiSuccess<DashboardStats>>> => {
  await delay()
  const orders = await load<Order[]>('orders')
  const stats: DashboardStats = {
    totalOrders: orders.length,
    activeJobs: orders.filter((o) => o.status === 'IN_PRODUCTION').length,
    unpricedOrders: orders.filter((o) => o.status === 'UNPRICED_PENDING').length,
    accountingItems: 0,
    totalRevenue: orders.reduce((s, o) => s + Number(o.total_price || 0), 0),
    pendingOrders: orders.filter((o) => o.status === 'UNPRICED_PENDING').length,
    completedOrders: orders.filter((o) => o.status === 'DELIVERED').length,
  }
  return wrap(stats, 'Dashboard stats fetched successfully')
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export const getOrders = async (
  params: GetOrdersParams = {}
): Promise<AxiosResponse<ApiSuccess<Order[]>>> => {
  await delay()
  let data = await load<Order[]>('orders')
  const { status, q } = params

  if (status) data = data.filter((o) => o.status === status)
  if (q)
    data = data.filter((o) =>
      String(o.id).includes(q)
    )

  return wrap(data, 'Orders fetched successfully')
}

export const getMyOrders = () => getOrders()
export const getOrdersInProduction = () => getOrders({ status: 'IN_PRODUCTION' })
export const getOrdersPendingQuote = () => getOrders({ status: 'UNPRICED_PENDING' })
export const getUnpricedQueue = () => getOrders({ status: 'UNPRICED_PENDING' })
export const searchOrders = (q: string) => getOrders({ q })

export const getOrderById = async (
  orderId: number
): Promise<AxiosResponse<ApiSuccess<Order>>> => {
  await delay()
  const data = await load<Order[]>('orders')
  const order = data.find((o) => o.id === orderId)
  if (!order) throw { response: { status: 404, data: { success: false, message: 'Order not found' } } }
  return wrap(order, 'Order fetched successfully')
}

export const getOrderHistory = async (
  orderId: number
): Promise<AxiosResponse<ApiSuccess<OrderStatusHistory[]>>> => {
  await delay()
  // No history JSON yet — return empty array until backend implements this
  return wrap([] as OrderStatusHistory[], 'Order history fetched successfully')
}

export const createOrder = async (
  orderData: CreateOrderPayload
): Promise<AxiosResponse<ApiSuccess<Order>>> => {
  await delay(500)
  console.log('[MOCK] createOrder', orderData)
  const newOrder: Order = {
    id: Date.now(),
    status: (orderData.status ?? 'UNPRICED_PENDING') as Order['status'],
    quantity: orderData.quantity,
    total_price: Number(orderData.total_price),
    customer: 1,
    approved_by: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    due_date: null,
    paid_amount: null,
  }
  return wrap(newOrder, 'Order created successfully')
}

export const replaceOrder = async (
  orderId: number,
  orderData: UpdateOrderPayload
): Promise<AxiosResponse<ApiSuccess<Order>>> => {
  await delay(400)
  console.log('[MOCK] replaceOrder', orderId, orderData)
  return wrap(
    {
      id: orderId,
      customer: 1,
      approved_by: null,
      status: (orderData.status ?? 'UNPRICED_PENDING') as Order['status'],
      quantity: orderData.quantity ?? 1,
      total_price: Number(orderData.total_price ?? 0),
      created_at: new Date().toISOString(),
      updated_at: null,
      due_date: null,
      paid_amount: null,
    },
    'Order updated successfully'
  )
}

export const updateOrder = async (
  orderId: number,
  updates: UpdateOrderPayload
): Promise<AxiosResponse<ApiSuccess<Order>>> => {
  await delay(400)
  console.log('[MOCK] updateOrder', orderId, updates)
  return wrap(
    {
      id: orderId,
      customer: 1,
      approved_by: null,
      status: (updates.status ?? 'UNPRICED_PENDING') as Order['status'],
      quantity: updates.quantity ?? 1,
      total_price: Number(updates.total_price ?? 0),
      created_at: new Date().toISOString(),
      updated_at: null,
      due_date: null,
      paid_amount: null,
    },
    'Order updated successfully'
  )
}

export const deleteOrder = async (
  orderId: number
): Promise<AxiosResponse<ApiSuccess<Record<string, never>>>> => {
  await delay(400)
  console.log('[MOCK] deleteOrder', orderId)
  return wrap({}, 'Order deleted successfully')
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

export const getQuotes = async (): Promise<AxiosResponse<ApiSuccess<Quote[]>>> => {
  await delay()
  return wrap(await load<Quote[]>('quotes'), 'Quotes fetched successfully')
}

export const getQuoteById = async (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<Quote>>> => {
  await delay()
  const data = await load<Quote[]>('quotes')
  const quote = data.find((q) => q.id === quoteId)
  if (!quote) throw { response: { status: 404, data: { success: false, message: 'Quote not found' } } }
  return wrap(quote, 'Quote fetched successfully')
}

export const createQuote = async (
  quoteData: SubmitQuotePayload & { orderId: number }
): Promise<AxiosResponse<ApiSuccess<Quote>>> => {
  await delay(500)
  console.log('[MOCK] createQuote', quoteData)
  return wrap({ id: Date.now(), ...quoteData, status: 'Awaiting Confirmation', clientId: 1 } as unknown as Quote)
}

export const updateQuote = async (
  quoteId: number,
  updates: Partial<Quote>
): Promise<AxiosResponse<ApiSuccess<Quote>>> => {
  await delay(400)
  console.log('[MOCK] updateQuote', quoteId, updates)
  return wrap({ id: quoteId, ...updates } as Quote)
}

export const deleteQuote = async (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<Record<string, never>>>> => {
  await delay(300)
  console.log('[MOCK] deleteQuote', quoteId)
  return wrap({}, 'Quote deleted successfully')
}

export const approveQuote = async (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<ApproveQuoteResponse>>> => {
  await delay(500)
  console.log('[MOCK] approveQuote', quoteId)
  const mockOrder: Order = { id: Date.now(), status: 'CONFIRMED', quantity: 1, total_price: 0, customer: 1, approved_by: null, created_at: new Date().toISOString(), updated_at: null, due_date: null, paid_amount: null }
  return wrap({ quote: { id: quoteId, status: 'Approved' }, order: mockOrder })
}

export const confirmQuote = async (
  quoteId: number
): Promise<AxiosResponse<ApiSuccess<Pick<Quote, 'id' | 'status'>>>> => {
  await delay(400)
  console.log('[MOCK] confirmQuote', quoteId)
  return wrap({ id: quoteId, status: 'Approved' as const })
}

export const requestQuoteChanges = async (
  quoteId: number,
  payload: QuoteChangeRequest
): Promise<AxiosResponse<ApiSuccess<Pick<Quote, 'id' | 'status'>>>> => {
  await delay(400)
  console.log('[MOCK] requestQuoteChanges', quoteId, payload)
  return wrap({ id: quoteId, status: 'Changes Requested' as const })
}

export const submitQuoteForOrder = async (
  orderId: number,
  quoteData: SubmitQuotePayload
): Promise<AxiosResponse<ApiSuccess<Quote>>> => {
  await delay(500)
  console.log('[MOCK] submitQuoteForOrder', orderId, quoteData)
  return wrap({ id: Date.now(), orderId, ...quoteData } as unknown as Quote)
}

export const getProductionJobs = async (): Promise<AxiosResponse<ApiSuccess<any[]>>> => {
  await delay()
  return wrap([], 'Production jobs fetched successfully')
}

export const updateProductionJob = async (
  itemId: number | string,
  updates: { current_step?: string; completed_quantity?: number }
): Promise<AxiosResponse<ApiSuccess<any>>> => {
  await delay(300)
  console.log('[MOCK] updateProductionJob', itemId, updates)
  return wrap({ id: itemId, ...updates }, 'Production job updated successfully')
}
