// src/lib/api/documentsProductionService.ts
import api from './axiosInstance'
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
} from './types'

// ─── Uploads ──────────────────────────────────────────────────────────────────
// All confirmed tested: POST/GET/GET<id>/DELETE /api/uploads/
// IMPORTANT: POST uses multipart/form-data, not JSON.

/**
 * Extended payload that adds the two fields needed for structured storage paths.
 *
 * - owner_id  : the client the file belongs to (owner/staff uploads on their behalf)
 * - item_type : the order_items.item_type value, e.g. 'Book', 'Business Card'
 *
 * Both are optional — callers that don't supply them get the legacy
 * flat  uploads/{filename}  path, so nothing breaks.
 *
 * Django will build the path:
 *   {owner_id}/{item_type_slug}/{file_type}/{filename}
 * e.g.
 *   42/business_card/cover/front_design.pdf
 */
export interface CreateUploadWithPathPayload extends CreateUploadPayload {
  owner_id?  : number
  item_type? : string
  onProgress?: (percent: number) => void
}

/**
 * POST /api/uploads/ — confirmed tested.
 * Sends multipart/form-data with:
 *   file        (File)
 *   file_type   cover | content | preview | package_image
 *   owner_id    (optional) client user id
 *   item_type   (optional) e.g. 'Book', 'Business Card'
 *
 * uploaded_by is set automatically from the JWT on the server.
 */
export const createUpload = (
  payload   : CreateUploadWithPathPayload | FormData,
  onProgress?: (percent: number) => void,
): Promise<AxiosResponse<ApiSuccess<Upload>>> => {
  // ── Legacy FormData path (unchanged) ────────────────────────────────────
  if (payload instanceof FormData) {
    return api.post('/api/uploads/', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? e => { if (e.total) onProgress(Math.round((e.loaded * 100) / e.total)) }
        : undefined,
    })
  }

  // ── Object payload path ───────────────────────────────────────────────────
  const { file, file_type, owner_id, item_type, onProgress: progressCb } = payload
  const progressHandler = progressCb ?? onProgress

  const formData = new FormData()
  formData.append('file',      file)
  formData.append('file_type', file_type)

  // Only append when present — Django falls back to legacy path without them
  if (owner_id !== undefined) formData.append('owner_id',  String(owner_id))
  if (item_type)              formData.append('item_type', item_type)

  return api.post('/api/uploads/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: progressHandler
      ? e => { if (e.total) progressHandler(Math.round((e.loaded * 100) / e.total)) }
      : undefined,
  })
}

/** GET /api/uploads/ — confirmed tested */
export const getUploads = (): Promise<AxiosResponse<ApiSuccess<Upload[]>>> =>
  api.get('/api/uploads/')

/** GET /api/uploads/<id>/ — confirmed tested */
export const getUploadById = (
  uploadId: number,
): Promise<AxiosResponse<ApiSuccess<Upload>>> =>
  api.get(`/api/uploads/${uploadId}/`)

/** DELETE /api/uploads/<id>/ — confirmed tested */
export const deleteUpload = (
  uploadId: number,
): Promise<AxiosResponse<ApiSuccess<Record<string, never>>>> =>
  api.delete(`/api/uploads/${uploadId}/`)


// ─── Batches / Production ─────────────────────────────────────────────────────
// NOT YET IMPLEMENTED on backend. Ready for when Django adds them.

/** @pending GET /api/production/active-jobs/ */
export const getActiveBatches = (): Promise<AxiosResponse<ApiSuccess<Batch[]>>> =>
  api.get('/api/production/active-jobs/')

/** @pending GET /api/production/work-view/<batchId>/ */
export const getBatchById = (
  batchId: string,
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.get(`/api/production/work-view/${batchId}/`)

/** @pending GET /api/batches/ with optional filters */
export const getBatches = (
  params: GetBatchesParams = {},
): Promise<AxiosResponse<ApiSuccess<Batch[]>>> => {
  const query: Record<string, unknown> = {}
  if (params.status) query.status = params.status
  if (params.q)      query.q      = params.q
  return api.get('/api/batches/', { params: query })
}

export const getCompletedBatches = () => getBatches({ status: 'COMPLETED' })
export const searchBatches       = (q: string) => getBatches({ q })

/** @pending PATCH /api/batches/<id>/ — top-level batch fields */
export const updateBatch = (
  batchId : string,
  updates : Partial<Batch>,
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.patch(`/api/batches/${batchId}/`, updates)

/** @pending PATCH /api/batches/<batchId>/progress/ */
export const updateBatchProgress = (
  batchId : string,
  payload : UpdateBatchProgressPayload,
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.patch(`/api/batches/${batchId}/progress/`, payload)

/** @pending PATCH /api/batches/<batchId>/stages/<stageName>/ */
export const updateBatchStage = (
  batchId  : string,
  stage    : string,
  updates  : UpdateBatchStagePayload,
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.patch(`/api/batches/${batchId}/stages/${stage}/`, updates)

/** @pending PATCH /api/batches/<batchId>/assign/ */
export const updateBatchAssignments = (
  batchId : string,
  payload : UpdateBatchAssignmentsPayload,
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.patch(`/api/batches/${batchId}/assign/`, payload)