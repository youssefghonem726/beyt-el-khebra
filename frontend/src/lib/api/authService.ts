import supabase from '../supabase'
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

export const signup = async (
  email: string,
  password: string,
  profileData: SignupProfileData = {}
): Promise<AuthResponse['data']> => {
  const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || 'New User',
        first_name: profileData.first_name || 'New',
        last_name: profileData.last_name || 'User',
        user_role: profileData.role || 'client',
      },
    },
  })

  if (error) throw error

  return data
}

export const getMe = (): Promise<AxiosResponse<ApiSuccess<UserProfile>>> =>
  api.get('/api/users/me/')

export const changePassword = async (
  payload: ChangePasswordPayload
): Promise<void> => {
  const { error } = await supabase.auth.updateUser({
    password: payload.newPassword,
  })

  if (error) throw error
}

export const logout = async (): Promise<void> => {
  await supabase.auth.signOut()
}