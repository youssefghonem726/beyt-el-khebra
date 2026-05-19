import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

export interface UploadFile {
  id: number;
  url: string;
  file_type: string;
  uploaded_by: number;
  created_at: string;
  file_name: string | null;
  reorder_count: number | null;
  owner_id: number | null;
  mime_type: string | null;
  file_size?: number | null;
  order?: number | null;
  order_id?: number | null;
  order_item?: number | null;
  order_item_id?: number | null;
}

/** Fetch the authenticated user's uploads */
export const getUploads = (): Promise<AxiosResponse<ApiSuccess<UploadFile[]>>> =>
  api.get('/api/uploads/');

/** Upload a new file. Accepts FormData or a simple object. */
export const createUpload = (
  data: FormData | { file: File; file_type: string; order_id?: number | string; order_item_id?: number | string }
): Promise<AxiosResponse<ApiSuccess<UploadFile>>> => {
  const formData = data instanceof FormData ? data : new FormData();
  if (!(data instanceof FormData)) {
    formData.append('file', data.file);
    formData.append('file_type', data.file_type);
    if (data.order_id) formData.append('order_id', String(data.order_id));
    if (data.order_item_id) formData.append('order_item_id', String(data.order_item_id));
  }
  return api.post('/api/uploads/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteUpload = (id: number): Promise<AxiosResponse<ApiSuccess<{}>>> =>
  api.delete(`/api/uploads/${id}/`);

export const updateUpload = (
  id: number,
  data: { file_name?: string; mime_type?: string; order_id?: number | string | null; order_item_id?: number | string | null }
): Promise<AxiosResponse<ApiSuccess<UploadFile>>> =>
  api.patch(`/api/uploads/${id}/`, data);
