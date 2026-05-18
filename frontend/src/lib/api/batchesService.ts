import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

/**
 * Fetch all batches.
 * GET /api/batches/
 * @pending — backend endpoint not yet implemented
 */
export const getBatches = (): Promise<AxiosResponse<ApiSuccess<any[]>>> =>
  api.get('/api/batches/');

export const getBatchById = (batchId: number): Promise<AxiosResponse<ApiSuccess<any>>> =>
  api.get(`/api/batches/${batchId}/`);

export const updateBatch = (batchId: number, data: any): Promise<AxiosResponse<ApiSuccess<any>>> =>
  api.patch(`/api/batches/${batchId}/`, data);