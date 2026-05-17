import api from './axiosInstance';
import type { ApiSuccess } from './types';

/**
 * Fetch all invoices (owner/staff) or client's own invoices (client).
 * Endpoint: GET /api/invoices/
 */
export const getInvoices = () =>
  api.get<ApiSuccess<any[]>>('/api/invoices/');