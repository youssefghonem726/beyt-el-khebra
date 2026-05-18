import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess, Order } from './types';

export type DeliveryStatus =
  | 'pending'
  | 'out_for_delivery'
  | 'delivered'
  | 'delayed'
  | 'lost'
  | 'scheduled'
  | 'in_transit'
  | 'lost_in_transit';

export interface DeliveryResponse {
  id: number;
  orderId: number;
  clientId: number;
  clientName?: string;
  clientEmail?: string;
  orderStatus?: string;
  orderTotal?: string | number | null;
  address: string;
  driver: string;
  company: string;
  phone: string;
  status: DeliveryStatus;
  progress: number;
  scheduledDate: string;
  deliveredAt?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDeliveryPayload {
  order_id: number;
  address?: string;
  driver?: string;
  company?: string;
  phone?: string;
  scheduled_date?: string;
  notes?: string;
}

export type UpdateDeliveryPayload = Partial<{
  status: DeliveryStatus;
  address: string;
  driver: string;
  company: string;
  phone: string;
  scheduled_date: string | null;
  notes: string;
}>;

export const getDeliveries = (
  params: { q?: string; status?: string } = {}
): Promise<AxiosResponse<ApiSuccess<DeliveryResponse[]>>> =>
  api.get('/api/deliveries/', { params });

export const getDeliveryById = (
  deliveryId: string
): Promise<AxiosResponse<ApiSuccess<DeliveryResponse>>> =>
  api.get(`/api/deliveries/${deliveryId}/`);

export const getDeliveryReadyOrders = (): Promise<AxiosResponse<ApiSuccess<Order[]>>> =>
  api.get('/api/deliveries/ready-orders/');

export const createDelivery = (
  payload: CreateDeliveryPayload
): Promise<AxiosResponse<ApiSuccess<DeliveryResponse>>> =>
  api.post('/api/deliveries/', payload);

export const updateDelivery = (
  deliveryId: string | number,
  payload: UpdateDeliveryPayload
): Promise<AxiosResponse<ApiSuccess<DeliveryResponse>>> =>
  api.patch(`/api/deliveries/${deliveryId}/`, payload);
