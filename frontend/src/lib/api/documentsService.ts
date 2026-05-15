import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

export interface Document {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
  reorderCount: number;
  ownerType: 'client' | 'order' | 'template';
  ownerId: string | null;
}

export const getDocuments = async (
  params: { ownerType?: string; ownerId?: string } = {}
): Promise<AxiosResponse<ApiSuccess<Document[]>>> => {
  const query: Record<string, unknown> = {};
  if (params.ownerType) query.ownerType = params.ownerType;
  if (params.ownerId) query.ownerId = params.ownerId;
  return api.get('/api/documents/', { params: query });
};