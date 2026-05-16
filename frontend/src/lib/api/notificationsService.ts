import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

// Matches your actual DB columns
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  unread: boolean;
  action_label?: string | null;
  action_page?: string | null;
  created_at: string;
}

/**
 * Fetch notifications for the authenticated user.
 * GET /api/notifications/
 */
export const getNotifications = (): Promise<
  AxiosResponse<ApiSuccess<Notification[]>>
> => api.get('/api/notifications/');