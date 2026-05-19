import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

export interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
}

export const getMe = (): Promise<AxiosResponse<ApiSuccess<UserProfile>>> =>
  api.get('/api/users/me/');

export const updateMe = (
  data: Partial<Pick<UserProfile, 'first_name' | 'last_name' | 'phone' | 'address'>>
): Promise<AxiosResponse<ApiSuccess<UserProfile>>> =>
  api.patch('/api/users/me/update/', data);
