import api from './axiosInstance';
import type { AxiosResponse } from 'axios';
import type { ApiSuccess } from './types';

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

export const getNotifications = (): Promise<
  AxiosResponse<ApiSuccess<Notification[]>>
> => api.get('/api/notifications/');

export const markNotificationRead = (
  notificationId: number
): Promise<AxiosResponse<ApiSuccess<Notification>>> =>
  api.patch(`/api/notifications/${notificationId}/read/`);

export const updateNotification = (
  notificationId: number,
  updates: { read?: boolean; unread?: boolean }
): Promise<AxiosResponse<ApiSuccess<Notification>>> =>
  api.patch(`/api/notifications/${notificationId}/`, updates);

export const markAllNotificationsRead = (): Promise<
  AxiosResponse<ApiSuccess<{ success: boolean; updated_count: number }>>
> => api.patch('/api/notifications/read-all/');

export const deleteNotification = (
  notificationId: number
): Promise<AxiosResponse<ApiSuccess<{ success: boolean; deleted_id: number }>>> =>
  api.delete(`/api/notifications/${notificationId}/delete/`);

export const clearReadNotifications = (): Promise<
  AxiosResponse<ApiSuccess<{ success: boolean; deleted_count: number }>>
> => api.delete('/api/notifications/read/');
