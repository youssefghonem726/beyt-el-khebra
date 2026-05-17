import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

export interface CreateTicketPayload {
  subject: string;
  order_id?: string;
  message: string;
}

export interface SupportTicket {
  id: number;
  user: number;
  subject: string;
  order_id: string | null;
  message: string;
  created_at: string;
}

export const createSupportTicket = (
  ticketData: CreateTicketPayload
): Promise<AxiosResponse<ApiSuccess<SupportTicket>>> =>
  api.post('/api/support/tickets/', ticketData);