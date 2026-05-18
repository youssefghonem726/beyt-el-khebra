import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import supabase from '../supabase'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  async (config) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const { data, error: refreshError } = await supabase.auth.refreshSession()
      const token = data.session?.access_token

      if (!refreshError && token) {
        if (originalRequest.headers) {
          ;(originalRequest.headers as Record<string, string>).Authorization = `Bearer ${token}`
        }

        return api(originalRequest)
      }

      await supabase.auth.signOut()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default api