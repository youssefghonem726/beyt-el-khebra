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
  status: string;                    // 'pending' | 'approved' | 'rejected' | 'converted'
  total_estimated_price: number | string | null;
  notes: string | null;
  created_at: string;
  items: QuoteItem[];
}

export const getQuotes = (): Promise<AxiosResponse<ApiSuccess<QuoteResponse[]>>> =>
  api.get('/api/quotes/');

export const getQuoteById = (quoteId: string): Promise<AxiosResponse<ApiSuccess<QuoteResponse>>> =>
  api.get(`/api/quotes/${quoteId}/`);