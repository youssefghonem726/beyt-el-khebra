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