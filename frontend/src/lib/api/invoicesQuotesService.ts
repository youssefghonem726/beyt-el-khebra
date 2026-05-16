import api from './axiosInstance';
import type { ApiSuccess } from './types';

export const getInvoices = () =>
  api.get<ApiSuccess<any[]>>('/api/invoices/');