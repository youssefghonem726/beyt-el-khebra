import api from './axiosInstance';
import type { ApiSuccess } from './types';

export interface DashboardApiResponse {
  orders: {
    total_orders: number;
    unpriced_orders: number;
    confirmed_orders: number;
    in_progress_orders: number;
    completed_orders: number;
    cancelled_orders: number;
  };
  payments: {
    total_order_value: number;
    total_paid_amount: number;
    total_remaining_amount: number;
    unpaid_orders: number;
    partial_paid_orders: number;
    paid_orders: number;
  };
  production: {
    total_items: number;
    total_quantity: number;
    total_completed_quantity: number;
    overall_progress_percentage: number;
    items_in_printing: number;
    items_in_packaging: number;
    items_ready: number;
  };
  // … include quotes/recent_activity later
}

export const getDashboardStats = () =>
  api.get<ApiSuccess<DashboardApiResponse>>('/api/dashboard/stats/');