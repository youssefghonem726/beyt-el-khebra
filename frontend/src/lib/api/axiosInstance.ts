// src/lib/api/axiosInstance.ts
import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { supabase } from '../supabase'

// Extend AxiosRequestConfig to support the _retry flag
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach Supabase JWT to every request
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Global response error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Token expired — try refreshing once
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError && session?.access_token) {
        if (originalRequest.headers) {
          (originalRequest.headers as Record<string, string>).Authorization =
            `Bearer ${session.access_token}`
        }
        return api(originalRequest)
      }
      // Refresh failed — sign out
      await supabase.auth.signOut()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api
