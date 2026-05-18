import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

export interface PricingRow {
  id: number;
  created_at: string;
  front: number | null;
  front_and_back: number | null;
  digital_cover_300g: number | null;
  digital_cover_200g: number | null;
  offset_cover_200g: number | null;
  offset_cover_300g: number | null;
  coil_size_10: number | null;
  coil_size_12: number | null;
  coil_size_14: number | null;
  coil_size_16: number | null;
  coil_size_18: number | null;
  coil_size_20: number | null;
  coil_size_22: number | null;
  coil_size_25: number | null;
  coil_size_28: number | null;
  coil_size_30: number | null;
  coil_size_32: number | null;
  coil_size_35: number | null;
  user: number | null;
  source?: 'default' | 'custom';
}

export const getPricingByUser = (userId: number): Promise<AxiosResponse<ApiSuccess<PricingRow | null>>> =>
  api.get(`/api/pricing/by-user/${userId}/`);

export const getDefaultPricing = (): Promise<AxiosResponse<ApiSuccess<PricingRow | null>>> =>
  api.get('/api/pricing/default/');

export const updateDefaultPricing = (data: Partial<PricingRow>): Promise<AxiosResponse<ApiSuccess<PricingRow>>> =>
  api.patch('/api/pricing/default/', data);

export const updatePricing = (pricingId: number, data: Partial<PricingRow>): Promise<AxiosResponse<ApiSuccess<PricingRow>>> =>
  api.patch(`/api/pricing/${pricingId}/`, data);

export const updatePricingByUser = (
  userId: number,
  data: Partial<PricingRow>
): Promise<AxiosResponse<ApiSuccess<PricingRow>>> =>
  api.patch(`/api/pricing/by-user/${userId}/`, data);
