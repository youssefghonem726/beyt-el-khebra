export type Role = 'owner' | 'manager' | 'client';

export interface NavItem {
  label: string;
  page: string;
}

export const NAVS: Record<Role, NavItem[]> = {
  owner: [
    { label: 'Dashboard', page: 'owner-dashboard' },
    { label: 'Unpriced Queue', page: 'unpriced-queue' },
    { label: 'Production', page: 'owner-production' },
    { label: 'Client Management', page: 'client-management' },
    { label: 'Delivery Tracking', page: 'delivery-tracking' },
    { label: 'Accounting', page: 'accounting' },
    { label: 'Notifications', page: 'owner-notifications' },
    { label: 'Settings', page: 'owner-settings' },
  ],
  manager: [
    { label: 'Dashboard', page: 'active-jobs' },
    { label: 'Completed Jobs', page: 'completed-jobs' },
    { label: 'Work View', page: 'order-work-view' },
  ],
  client: [
    { label: 'Dashboard', page: 'client-dashboard' },
    { label: 'My Orders', page: 'my-orders' },
    { label: 'Place New Order', page: 'place-new-order' },
    { label: 'Quotes', page: 'quotes' },
    { label: 'Invoices', page: 'client-invoices' },
    { label: 'Notifications', page: 'client-notifications' },
    { label: 'Profile Settings', page: 'profile-settings' },
    { label: 'Support', page: 'support' },
  ],
};
