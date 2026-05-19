import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

export interface QuoteItem {
  id?: number;
  item_type: string | null;
  quantity: number | null;
  estimated_unit_price: number | string | null;   // decimal comes as string from DRF
  estimated_total_price: number | string | null;
  notes?: string | null;
}

export interface QuoteResponse {
  id: number;
  customer: number;                  // user ID
  order: number;
  order_status?: string;
  product_summary?: string;
  status: string;                    // 'pending' | 'approved' | 'rejected' | 'converted'
  total_estimated_price: number | string | null;
  notes: string | null;
  created_at: string;
  items: QuoteItem[];
  order_items?: Array<{
    id: number;
    item_type: string | null;
    quantity: number | null;
    notes?: string | null;
    unit_price?: number | string | null;
    total_price?: number | string | null;
  }>;
}

export const getQuotes = (): Promise<AxiosResponse<ApiSuccess<QuoteResponse[]>>> =>
  api.get('/api/quotes/');

export const getQuoteById = (quoteId: string): Promise<AxiosResponse<ApiSuccess<QuoteResponse>>> =>
  api.get(`/api/quotes/${quoteId}/`);

export const approveQuote = (quoteId: string | number): Promise<AxiosResponse<ApiSuccess<any>>> =>
  api.post(`/api/quotes/${quoteId}/approve/`);

export const rejectQuote = (quoteId: string | number): Promise<AxiosResponse<ApiSuccess<QuoteResponse>>> =>
  api.post(`/api/quotes/${quoteId}/reject/`);

export const requestQuoteChanges = (
  quoteId: string | number,
  notes: string
): Promise<AxiosResponse<ApiSuccess<QuoteResponse>>> =>
  api.post(`/api/quotes/${quoteId}/request-changes/`, { notes });
