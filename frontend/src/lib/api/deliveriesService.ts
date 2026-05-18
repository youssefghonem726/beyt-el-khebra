import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

export interface DeliveryResponse {
  id: number;
  orderId: number;
  clientId: number;
  address: string;
  driver: string;
  company: string;
  phone: string;
  status: string;
  progress: number;
  scheduledDate: string;
  created_at: string;
  updated_at: string;
}

export const getDeliveries = (): Promise<AxiosResponse<ApiSuccess<DeliveryResponse[]>>> =>
  api.get('/api/deliveries/');

export const getDeliveryById = (
  deliveryId: string
): Promise<AxiosResponse<ApiSuccess<DeliveryResponse>>> =>
  api.get(`/api/deliveries/${deliveryId}/`);
