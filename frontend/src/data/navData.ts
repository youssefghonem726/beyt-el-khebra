export type Role = 'owner' | 'manager' | 'client';

export interface NavItem {
  labelKey: string;
  label?: string;
  page: string;
  path: string;
}

export const NAVS: Record<Role, NavItem[]> = {
  owner: [
    { labelKey: 'dashboard',        page: 'owner-dashboard',     path: '/owner' },
    { labelKey: 'placeOrder',       page: 'owner-place-order',   path: '/owner/place-order' },
    { labelKey: 'unpricedQueue',    page: 'unpriced-queue',      path: '/owner/unpriced-queue' },
    { labelKey: 'production',       page: 'owner-production',    path: '/owner/production' },
    { labelKey: 'clientManagement', page: 'client-management',   path: '/owner/clients' },
    { labelKey: 'deliveryTracking', page: 'delivery-tracking',   path: '/owner/delivery-tracking' },
    { labelKey: 'accounting',       page: 'accounting',          path: '/owner/accounting' },
    { labelKey: 'notifications',    page: 'owner-notifications', path: '/owner/notifications' },
    { labelKey: 'settings',         page: 'owner-settings',      path: '/owner/settings' },
  ],
  manager: [
    { labelKey: 'dashboard',      page: 'active-jobs',     path: '/manager/jobs' },
    { labelKey: 'orders',         page: 'manager-orders',  path: '/manager/orders' },
    { labelKey: 'completedJobs',  page: 'completed-jobs',  path: '/manager/completed' },
    { labelKey: 'workView',       page: 'order-work-view', path: '/manager/work-view' },
    { labelKey: 'batchLookup',    page: 'batch-lookup',    path: '/manager/batch-lookup' },
    { labelKey: 'delivery',       page: 'delivery-list',   path: '/manager/deliveries' },
    { labelKey: 'notifications',  page: 'manager-notifications', path: '/manager/notifications' },
  ],
  client: [
    { labelKey: 'dashboard',       page: 'client-dashboard',     path: '/client' },
    { labelKey: 'myOrders',        page: 'my-orders',            path: '/client/orders' },
    { labelKey: 'placeNewOrder',   page: 'place-new-order',      path: '/client/place-order' },
    { labelKey: 'quotes',          page: 'quotes',               path: '/client/quotes' },
    { labelKey: 'documents',       page: 'document-management',  path: '/client/documents' },
    { labelKey: 'invoices',        page: 'client-invoices',      path: '/client/invoices' },
    { labelKey: 'notifications',   page: 'client-notifications', path: '/client/notifications' },
    { labelKey: 'profileSettings', page: 'profile-settings',     path: '/client/profile' },
    { labelKey: 'support',         page: 'support',              path: '/client/support' },
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
    'owner-unpriced-queue': '/owner/unpriced-queue',
    'client-detail':        '/owner/clients',
    // manager extras
    'delivery-view-more':   '/manager/deliveries',
    'edit-order':           '/manager/orders',
    'manager-order-details':'/manager/orders',
    'manager-notifications':'/manager/notifications',
    // client extras
    'client-order-detail':  '/client/orders',
    'invoice-detail':       '/client/invoices',
    'quote-detail':         '/client/quotes',
    'track-order':          '/client/track-order',
  } as Record<string, string>);
