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
  status: string;
  created_at: string;
}

export interface SupportContact {
  phone: string;
  email: string;
  facebook_url: string;
  messenger_name: string;
  hours: string;
}

export const getSupportContact = (): Promise<AxiosResponse<ApiSuccess<SupportContact>>> =>
  api.get('/api/settings/support-contact/');

export const createSupportTicket = (
  ticketData: CreateTicketPayload
): Promise<AxiosResponse<ApiSuccess<SupportTicket>>> =>
  api.post('/api/support/tickets/', ticketData);
