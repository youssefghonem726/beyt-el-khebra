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

// ─── Uploads ─────────────────────────────────────────────────────────────────
// All confirmed tested: POST/GET/GET<id>/DELETE /api/uploads/
// IMPORTANT: POST uses multipart/form-data, not JSON.

/**
 * POST /api/uploads/ — confirmed tested.
 * Sends multipart/form-data with `file` (File) and `file_type` (string).
 * Allowed file_type values: cover | content | preview | package_image
 * The uploaded_by field is set automatically from the JWT on the server.
 */
export const createUpload = (
  payload: CreateUploadPayload | FormData,
  onProgress?: (percent: number) => void
): Promise<AxiosResponse<ApiSuccess<Upload>>> => {
  const formData = payload instanceof FormData ? payload : new FormData()

  if (!(payload instanceof FormData)) {
    formData.append('file', payload.file)
    formData.append('file_type', payload.file_type)
  }

  return api.post('/api/uploads/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
      ? (e) => {
          if (e.total) onProgress(Math.round((e.loaded * 100) / e.total))
        }
      : undefined,
  })
}

/** GET /api/uploads/ — confirmed tested */
export const getUploads = (): Promise<AxiosResponse<ApiSuccess<Upload[]>>> =>
  api.get('/api/uploads/')

/** GET /api/uploads/<id>/ — confirmed tested */
export const getUploadById = (
  uploadId: number
): Promise<AxiosResponse<ApiSuccess<Upload>>> =>
  api.get(`/api/uploads/${uploadId}/`)

/** DELETE /api/uploads/<id>/ — confirmed tested */
export const deleteUpload = (
  uploadId: number
): Promise<AxiosResponse<ApiSuccess<Record<string, never>>>> =>
  api.delete(`/api/uploads/${uploadId}/`)

// ─── Batches / Production ────────────────────────────────────────────────────
// NOT YET IMPLEMENTED on backend. Ready for when Django adds them.

/** @pending GET /api/production/active-jobs/ */
export const getActiveBatches = (): Promise<AxiosResponse<ApiSuccess<Batch[]>>> =>
  api.get('/api/production/active-jobs/')

/** @pending GET /api/production/work-view/<batchId>/ */
export const getBatchById = (
  batchId: string
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.get(`/api/production/work-view/${batchId}/`)

/** @pending GET /api/batches/ with optional filters */
export const getBatches = (
  params: GetBatchesParams = {}
): Promise<AxiosResponse<ApiSuccess<Batch[]>>> => {
  const query: Record<string, unknown> = {}
  if (params.status) query.status = params.status
  if (params.q) query.q = params.q
  return api.get('/api/batches/', { params: query })
}

export const getCompletedBatches = () => getBatches({ status: 'COMPLETED' })
export const searchBatches = (q: string) => getBatches({ q })

/** @pending PATCH /api/batches/<id>/ — top-level batch fields */
export const updateBatch = (
  batchId: string,
  updates: Partial<Batch>
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.patch(`/api/batches/${batchId}/`, updates)

/** @pending PATCH /api/batches/<batchId>/progress/ */
export const updateBatchProgress = (
  batchId: string,
  payload: UpdateBatchProgressPayload
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.patch(`/api/batches/${batchId}/progress/`, payload)

/** @pending PATCH /api/batches/<batchId>/stages/<stageName>/ */
export const updateBatchStage = (
  batchId: string,
  stage: string,
  updates: UpdateBatchStagePayload
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.patch(`/api/batches/${batchId}/stages/${stage}/`, updates)

/** @pending PATCH /api/batches/<batchId>/assign/ */
export const updateBatchAssignments = (
  batchId: string,
  payload: UpdateBatchAssignmentsPayload
): Promise<AxiosResponse<ApiSuccess<Batch>>> =>
  api.patch(`/api/batches/${batchId}/assign/`, payload)
