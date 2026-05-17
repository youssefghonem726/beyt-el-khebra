import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

export interface PricingRow {
  id: number;
  created_at: string;
  Front: number | null;
  Front_and_back: number | null;
  Digital_Cover_300g: number | null;
  Digital_Cover_200g: number | null;
  Offset_Cover_200g: number | null;
  Offset_Cover_300g: number | null;
  Coil_size_10: number | null;
  Coil_size_12: number | null;
  Coil_size_14: number | null;
  Coil_size_16: number | null;
  Coil_size_18: number | null;
  Coil_size_20: number | null;
  Coil_size_22: number | null;
  Coil_size_25: number | null;
  Coil_size_28: number | null;
  Coil_size_30: number | null;
  Coil_size_32: number | null;
  Coil_size_35: number | null;
  user: number | null;
}

export const getPricingByUser = (userId: number): Promise<AxiosResponse<ApiSuccess<PricingRow | null>>> =>
  api.get(`/api/pricing/by-user/${userId}/`);

export const updatePricing = (pricingId: number, data: Partial<PricingRow>): Promise<AxiosResponse<ApiSuccess<PricingRow>>> =>
  api.patch(`/api/pricing/${pricingId}/`, data);