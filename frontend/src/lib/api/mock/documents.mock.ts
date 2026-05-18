import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from '../types';

// Document shape – matches the JSON you provided
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

const delay = (ms = 300): Promise<void> => new Promise((res) => setTimeout(res, ms));

const load = <T>(file: string): Promise<T> =>
  fetch(`/data/json/${file}.json`).then((res) => {
    if (!res.ok) throw new Error(`Mock: failed to load ${file}.json`);
    return res.json() as Promise<T>;
  });

const wrap = <T>(data: T, message = 'OK'): AxiosResponse<ApiSuccess<T>> => ({
  data: { success: true, message, data },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as never,
});

/** GET /api/documents/?ownerType=client&ownerId=CL-001 (future real endpoint) */
export const getDocuments = async (
  params: { ownerType?: string; ownerId?: string } = {}
): Promise<AxiosResponse<ApiSuccess<Document[]>>> => {
  await delay();
  const allDocs = await load<Document[]>('documents');
  let result = allDocs;
  if (params.ownerType) {
    result = result.filter((d) => d.ownerType === params.ownerType);
  }
  if (params.ownerId) {
    result = result.filter((d) => d.ownerId === params.ownerId);
  }
  return wrap(result, 'Documents fetched successfully');
};