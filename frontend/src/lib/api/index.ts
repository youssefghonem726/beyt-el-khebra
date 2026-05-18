// src/lib/api/index.ts
// Single import point for the entire API layer.
// Switches between mock (local JSON) and real Django backend
// based on VITE_USE_MOCK in your .env file.
//
//   VITE_USE_MOCK=true   → reads /public/data/json/*.json  (no backend needed)
//   VITE_USE_MOCK=false  → calls http://127.0.0.1:8000     (Django backend)

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const ordersQuotes = USE_MOCK
  ? await import('./mock/orders.mock')
  : await import('./ordersQuotesService')

const documentsProduction = USE_MOCK
  ? await import('./mock/production.mock')
  : await import('./documentsProductionService')

const invoicesClients = USE_MOCK
  ? await import('./mock/invoicesClients.mock')
  : await import('./invoicesClientsSettingsService')

const documents = USE_MOCK
  ? await import('./mock/documents.mock')
  : await import('./documentsService');

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const { getDashboardStats } = ordersQuotes

// ─── Orders ──────────────────────────────────────────────────────────────────
export const {
  getOrders,
  getMyOrders,
  getOrdersInProduction,
  getOrdersPendingQuote,
  getUnpricedQueue,
  getProductionJobs,
  updateProductionJob,
  searchOrders,
  getOrderById,
  getOrderHistory,
  createOrder,
  replaceOrder,
  updateOrder,
  deleteOrder,
} = ordersQuotes

// ─── Documents ──────────────────────────────────────────────────────────────────
export const { 
  getDocuments 
} = documents;

// ─── Quotes ──────────────────────────────────────────────────────────────────
export const {
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  approveQuote,
  confirmQuote,
  requestQuoteChanges,
  submitQuoteForOrder,
} = ordersQuotes

// ─── Uploads ─────────────────────────────────────────────────────────────────
export const {
  createUpload,
  getUploads,
  getUploadById,
  deleteUpload,
} = documentsProduction

// ─── Batches / Production ────────────────────────────────────────────────────
export const {
  getBatches,
  getActiveBatches,
  getCompletedBatches,
  searchBatches,
  getBatchById,
  updateBatch,
  updateBatchProgress,
  updateBatchStage,
  updateBatchAssignments,
} = documentsProduction

// ─── Deliveries ──────────────────────────────────────────────────────────────
export const {
  getDeliveries,
  getDeliveryById,
  updateDelivery,
  markDelivered,
  rescheduleDelivery,
  cancelDelivery,
} = invoicesClients

// ─── Invoices ────────────────────────────────────────────────────────────────
export const {
  getInvoices,
  getInvoiceById,
  payInvoice,
  downloadInvoice,
} = invoicesClients

// ─── Accounting ──────────────────────────────────────────────────────────────
export const {
  getAccountingOverview,
  getClientSummary,
  getRevenue,
} = invoicesClients

// ─── Clients ─────────────────────────────────────────────────────────────────
export const {
  getClients,
  getClientById,
  replaceClient,
  updateClient,
} = invoicesClients

// ─── Notifications ───────────────────────────────────────────────────────────
export const {
  getNotifications,
  markNotificationRead,
  updateNotification,
  markAllNotificationsRead,
} = invoicesClients

// ─── Support ─────────────────────────────────────────────────────────────────
export const {
  createSupportTicket,
  getSupportTickets,
  getSupportTicketById,
} = invoicesClients

// ─── Settings ────────────────────────────────────────────────────────────────
export const {
  getSettings,
  updatePricingRolesSettings,
  updatePricingSettings,
  updateWhatsappSettings,
  getUsers,
  updateUser,
} = invoicesClients

// ─── Auth & base Axios instance ──────────────────────────────────────────────
export { default as api } from './axiosInstance'
export * from './authService'

// ─── All types — import from here, not from individual files ─────────────────
export type * from './types'
