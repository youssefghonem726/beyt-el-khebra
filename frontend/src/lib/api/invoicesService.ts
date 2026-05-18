import api from './axiosInstance';
import type { ApiSuccess } from './types';

/**
 * Fetch all invoices (owner/staff) or client's own invoices (client).
 * Endpoint: GET /api/invoices/
 */
export const getInvoices = () =>
  api.get<ApiSuccess<any[]>>('/api/invoices/');

export const getAccountingOverview = () =>
  api.get<ApiSuccess<any>>('/api/invoices/accounting/');

export const generateInvoice = (orderId: number | string) =>
  api.post<ApiSuccess<any>>('/api/invoices/generate/', { order_id: orderId });

export const payInvoice = (
  invoiceId: number | string,
  payload: { amount?: number; mark_full?: boolean } = { mark_full: true }
) =>
  api.post<ApiSuccess<any>>(`/api/invoices/${invoiceId}/pay/`, payload);
