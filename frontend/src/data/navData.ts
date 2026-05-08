export type Role = 'owner' | 'manager' | 'client';

export interface NavItem {
  label: string;
  page: string;
  path: string;
}

export const NAVS: Record<Role, NavItem[]> = {
  owner: [
    { label: 'Dashboard',         page: 'owner-dashboard',     path: '/owner' },
    { label: 'Unpriced Queue',    page: 'unpriced-queue',      path: '/owner/unpriced-queue' },
    { label: 'Production',        page: 'owner-production',    path: '/owner/production' },
    { label: 'Client Management', page: 'client-management',   path: '/owner/clients' },
    { label: 'Delivery Tracking', page: 'delivery-tracking',   path: '/owner/delivery-tracking' },
    { label: 'Accounting',        page: 'accounting',          path: '/owner/accounting' },
    { label: 'Notifications',     page: 'owner-notifications', path: '/owner/notifications' },
    { label: 'Settings',          page: 'owner-settings',      path: '/owner/settings' },
  ],
  manager: [
    { label: 'Dashboard',      page: 'active-jobs',     path: '/manager/jobs' },
    { label: 'Orders',         page: 'manager-orders',  path: '/manager/orders' },
    { label: 'Completed Jobs', page: 'completed-jobs',  path: '/manager/completed' },
    { label: 'Work View',      page: 'order-work-view', path: '/manager/work-view' },
    { label: 'Batch Lookup',   page: 'batch-lookup',    path: '/manager/batch-lookup' },
    { label: 'Delivery',       page: 'delivery-list',   path: '/manager/deliveries' },
  ],
  client: [
    { label: 'Dashboard',        page: 'client-dashboard',     path: '/client' },
    { label: 'My Orders',        page: 'my-orders',            path: '/client/orders' },
    { label: 'Place New Order',  page: 'place-new-order',      path: '/client/place-order' },
    { label: 'Quotes',           page: 'quotes',               path: '/client/quotes' },
    { label: 'Documents',        page: 'document-management',  path: '/client/documents' },
    { label: 'Invoices',         page: 'client-invoices',      path: '/client/invoices' },
    { label: 'Notifications',    page: 'client-notifications', path: '/client/notifications' },
    { label: 'Profile Settings', page: 'profile-settings',     path: '/client/profile' },
    { label: 'Support',          page: 'support',              path: '/client/support' },
  ],
};

export const PAGE_TO_PATH: Record<string, string> = Object.values(NAVS)
  .flat()
  .reduce((acc, item) => ({ ...acc, [item.page]: item.path }), {
    // auth
    'login':          '/login',
    'create-account': '/create-account',
    'testing':        '/test',
    // owner extras (used in buttons but not in sidebar)
    'owner-manager-orders': '/manager/orders',
    'owner-batch-lookup':   '/manager/batch-lookup',
    'client-detail':        '/owner/clients',
    // manager extras
    'delivery-view-more':   '/manager/deliveries',
    'edit-order':           '/manager/orders',
    'manager-order-details':'/manager/orders',
    // client extras
    'client-order-detail':  '/client/orders',
    'invoice-detail':       '/client/invoices',
    'quote-detail':         '/client/quotes',
    'track-order':          '/client/track-order',
  } as Record<string, string>);