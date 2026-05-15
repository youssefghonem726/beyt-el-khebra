// src/lib/api/mock/production.mock.ts
// Mock for documentsProductionService — reads from /public/data/json/

import type { AxiosResponse } from 'axios'
import type {
  ApiSuccess,
  Upload,
  CreateUploadPayload,
  Batch,
  GetBatchesParams,
  UpdateBatchProgressPayload,
  UpdateBatchStagePayload,
  UpdateBatchAssignmentsPayload,
} from '../types'

const delay = (ms = 300): Promise<void> => new Promise((res) => setTimeout(res, ms))

const load = <T>(file: string): Promise<T> =>
  fetch(`/data/json/${file}.json`).then((res) => {
    if (!res.ok) throw new Error(`Mock: failed to load ${file}.json`)
    return res.json() as Promise<T>
  })

const wrap = <T>(data: T, message = 'OK'): AxiosResponse<ApiSuccess<T>> => ({
  data: { success: true, message, data },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as never,
})

// ─── Uploads ─────────────────────────────────────────────────────────────────
// Mirrors the confirmed /api/uploads/ endpoints.
// Real endpoint uses multipart/form-data; mock uses the File object directly.

export const createUpload = async (
  payload: CreateUploadPayload,
  onProgress?: (percent: number) => void
): Promise<AxiosResponse<ApiSuccess<Upload>>> => {
  for (let p = 0; p <= 100; p += 25) {
    await delay(80)
    onProgress?.(p)
  }
  console.log('[MOCK] createUpload', payload.file_type, payload.file.name)
  const upload: Upload = {
    id: Date.now(),
    url: `/media/uploads/${payload.file.name}`,
    file_type: payload.file_type,
    uploaded_by: 1,
  }
  return wrap(upload, 'File uploaded successfully')
}

export const getUploads = async (): Promise<AxiosResponse<ApiSuccess<Upload[]>>> => {
  await delay()
  // No uploads JSON file — return empty list until you add one
  return wrap([] as Upload[], 'Uploads fetched successfully')
}

export const getUploadById = async (
  uploadId: number
): Promise<AxiosResponse<ApiSuccess<Upload>>> => {
  await delay()
  console.log('[MOCK] getUploadById', uploadId)
  return wrap({ id: uploadId, url: '/media/uploads/mock.pdf', file_type: 'content', uploaded_by: 1 }, 'Upload fetched successfully')
}

export const deleteUpload = async (
  uploadId: number
): Promise<AxiosResponse<ApiSuccess<Record<string, never>>>> => {
  await delay(300)
  console.log('[MOCK] deleteUpload', uploadId)
  return wrap({}, 'File deleted successfully')
}

// ─── Batches / Production ────────────────────────────────────────────────────

export const getBatches = async (
  params: GetBatchesParams = {}
): Promise<AxiosResponse<ApiSuccess<Batch[]>>> => {
  await delay()
  let data = await load<Batch[]>('batches')
  const { status, q } = params

  if (status === 'ACTIVE') {
    data = data.filter((b) => !['completed', 'canceled'].includes(b.status))
  } else if (status === 'COMPLETED') {
    data = data.filter((b) => b.status === 'completed')
  }

  if (q) {
    const lq = q.toLowerCase()
    data = data.filter(
      (b) =>
        b.id.toLowerCase().includes(lq) ||
        b.product.toLowerCase().includes(lq) ||
        b.orderId.toLowerCase().includes(lq)
    )
  }

  return wrap(data, 'Batches fetched successfully')
}

export const getActiveBatches = () => getBatches({ status: 'ACTIVE' })
export const getCompletedBatches = () => getBatches({ status: 'COMPLETED' })
export const searchBatches = (q: string) => getBatches({ q })

export const getBatchById = async (
  batchId: string
): Promise<AxiosResponse<ApiSuccess<Batch>>> => {
  await delay()
  const data = await load<Batch[]>('batches')
  const batch = data.find((b) => b.id === batchId)
  if (!batch) throw { response: { status: 404, data: { success: false, message: 'Batch not found' } } }
  return wrap(batch, 'Batch fetched successfully')
}

export const updateBatch = async (
  batchId: string,
  updates: Partial<Batch>
): Promise<AxiosResponse<ApiSuccess<Batch>>> => {
  await delay(400)
  console.log('[MOCK] updateBatch', batchId, updates)
  return wrap({ id: batchId, ...updates } as Batch)
}

export const updateBatchProgress = async (
  batchId: string,
  payload: UpdateBatchProgressPayload
): Promise<AxiosResponse<ApiSuccess<Batch>>> => {
  await delay(300)
  console.log('[MOCK] updateBatchProgress', batchId, payload)
  return wrap({ id: batchId, ...payload } as unknown as Batch)
}

export const updateBatchStage = async (
  batchId: string,
  stage: string,
  updates: UpdateBatchStagePayload
): Promise<AxiosResponse<ApiSuccess<Batch>>> => {
  await delay(400)
  console.log('[MOCK] updateBatchStage', batchId, stage, updates)
  return wrap({ id: batchId, stage, ...updates } as unknown as Batch)
}

export const updateBatchAssignments = async (
  batchId: string,
  payload: UpdateBatchAssignmentsPayload
): Promise<AxiosResponse<ApiSuccess<Batch>>> => {
  await delay(300)
  console.log('[MOCK] updateBatchAssignments', batchId, payload)
  return wrap({ id: batchId, ...payload } as unknown as Batch)
}
