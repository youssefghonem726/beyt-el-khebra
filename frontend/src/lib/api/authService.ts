// src/lib/api/authService.ts
import { supabase } from '../supabase'
import api from './axiosInstance'
import type { AxiosResponse } from 'axios'
import type { AuthResponse } from '@supabase/supabase-js'
import type { UserProfile, ApiSuccess, SignupProfileData, ChangePasswordPayload } from './types'

export const login = async (
  email: string,
  password: string
): Promise<AuthResponse['data']> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

/**
 * CreateAccount — registers via Supabase, then POSTs to Django to create
 * the profile record linked by supabase_uid.
 */
export const signup = async (
  email: string,
  password: string,
  profileData: SignupProfileData = {}
): Promise<AuthResponse['data']> => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  await api.post('/api/auth/signup/', {
    ...profileData,
    supabase_uid: data.user?.id,
  })
  return data
}

/**
 * GET /api/users/me/ — confirmed working.
 * Returns the Django user profile including role, used to determine
 * which dashboard and navigation to show on app load.
 */
export const getMe = (): Promise<AxiosResponse<ApiSuccess<UserProfile>>> =>
  api.get('/api/users/me/')

/**
 * Change password — goes through Supabase directly since Supabase owns auth.
 * Django has no session to invalidate; JWT expiry handles it.
 */
export const changePassword = async (
  payload: ChangePasswordPayload
): Promise<void> => {
  const { error } = await supabase.auth.updateUser({ password: payload.newPassword })
  if (error) throw error
}

/**
 * Logout — signs out of Supabase.
 * No Django call needed — Django is stateless (JWT only, no sessions).
 */
export const logout = async (): Promise<void> => {
  await supabase.auth.signOut()
}
