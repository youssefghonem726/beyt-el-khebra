import { useState, useEffect } from 'react';
import { NavigationContext } from './context/NavigationContext';
import { NAVS } from './data/navData';

import TestLanding from './pages/TestLanding';

// Auth
import Login from './pages/auth/Login';
import CreateAccount from './pages/auth/CreateAccount';

// Client
import ClientDashboard from './pages/client/ClientDashboard';
import MyOrders from './pages/client/MyOrders';
import PlaceNewOrder from './pages/client/PlaceNewOrder';
import TrackOrder from './pages/client/TrackOrder';
import ClientInvoices from './pages/client/ClientInvoices';
import ClientNotifications from './pages/client/ClientNotifications';
import ProfileSettings from './pages/client/ProfileSettings';
import Quotes from './pages/client/Quotes';
import Support from './pages/client/Support';
import DocumentManagement from './pages/client/DocumentManagement';
import InvoiceDetail from './pages/client/InvoiceDetail';

// Owner
import OwnerDashboard from './pages/owner/OwnerDashboard';
import Production from './pages/owner/Production';
import ClientManagement from './pages/owner/ClientManagement';
import Accounting from './pages/owner/Accounting';
import DeliveryTracking from './pages/owner/DeliveryTracking';
import OwnerNotifications from './pages/owner/OwnerNotifications';
import OwnerSettings from './pages/owner/OwnerSettings';
import UnpricedQueue from './pages/owner/UnpricedQueue';
import ClientDetail from './pages/owner/ClientDetail';

// Manager
import ActiveJobs from './pages/manager/ActiveJobs';
import ManagerOrders from './pages/manager/ManagerOrders';
import ManagerOrderDetails from './pages/manager/ManagerOrderDetails';
import EditOrder from './pages/manager/EditOrder';
import OrderWorkView from './pages/manager/OrderWorkView';
import CompletedJobs from './pages/manager/CompletedJobs';
import BatchLookup from './pages/manager/BatchLookup';
import DeliveryViewMore from './pages/manager/DeliveryViewMore';

const SIDEBAR_PAGES = new Set(
  Object.values(NAVS).flatMap(items => items.map(item => item.page))
);

export default function App() {
  const [page, setPage] = useState('test-landing');
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [clientId, setClientId] = useState('client-detail-ahmed');
  const [invoiceId, setInvoiceId] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page]);

  const navigate = (target: string) => {
    if (target.startsWith('client-detail-')) setClientId(target);
    if (target.startsWith('invoice-detail-')) setInvoiceId(target.replace('invoice-detail-', ''));
    // Sidebar (top-level) navigation resets history; drill-down navigation pushes to it
    if (SIDEBAR_PAGES.has(target)) {
      setNavHistory([]);
    } else {
      setNavHistory(h => [...h, page]);
    }
    setPage(target);
  };

  const goBack = () => {
    if (navHistory.length === 0) return;
    const prev = navHistory[navHistory.length - 1];
    if (prev.startsWith('client-detail-')) setClientId(prev);
    if (prev.startsWith('invoice-detail-')) setInvoiceId(prev.replace('invoice-detail-', ''));
    setPage(prev);
    setNavHistory(h => h.slice(0, -1));
  };

  const p = (node: React.ReactNode) => <div key={page} className="page">{node}</div>;

  const renderPage = () => {
    switch (page) {
      case 'test-landing': return p(<TestLanding onNavigate={navigate} />);

      // Auth
      case 'login':          return p(<Login onNavigate={navigate} />);
      case 'create-account': return p(<CreateAccount onNavigate={navigate} />);

      // Client
      case 'client-dashboard':     return p(<ClientDashboard onNavigate={navigate} />);
      case 'my-orders':            return p(<MyOrders onNavigate={navigate} />);
      case 'place-new-order':      return p(<PlaceNewOrder onNavigate={navigate} />);
      case 'track-order':          return <TrackOrder onNavigate={navigate} />;
      case 'client-invoices':      return p(<ClientInvoices onNavigate={navigate} />);
      case 'client-notifications': return p(<ClientNotifications onNavigate={navigate} />);
      case 'profile-settings':     return p(<ProfileSettings onNavigate={navigate} />);
      case 'quotes':               return p(<Quotes onNavigate={navigate} />);
      case 'support':              return p(<Support onNavigate={navigate} />);
      case 'document-management':  return p(<DocumentManagement onNavigate={navigate} />);

      // Client invoice detail
      case 'invoice-detail-INV-9021':
      case 'invoice-detail-INV-9018':
      case 'invoice-detail-INV-9015':
      case 'invoice-detail-INV-9012':
      case 'invoice-detail-INV-9008':
        return p(<InvoiceDetail onNavigate={navigate} invoiceId={invoiceId} />);

      // Owner
      case 'owner-dashboard':    return p(<OwnerDashboard onNavigate={navigate} />);
      case 'owner-production':   return p(<Production onNavigate={navigate} />);
      case 'client-management':  return p(<ClientManagement onNavigate={navigate} />);
      case 'accounting':         return p(<Accounting onNavigate={navigate} />);
      case 'delivery-tracking':  return p(<DeliveryTracking onNavigate={navigate} />);
      case 'owner-notifications': return p(<OwnerNotifications onNavigate={navigate} />);
      case 'owner-settings':     return p(<OwnerSettings onNavigate={navigate} />);
      case 'unpriced-queue':     return p(<UnpricedQueue onNavigate={navigate} />);
      case 'client-detail-ahmed':
      case 'client-detail-design-hub':
      case 'client-detail-retail-plus':
        return p(<ClientDetail onNavigate={navigate} clientId={clientId} />);

      // Manager
      case 'active-jobs':           return p(<ActiveJobs onNavigate={navigate} />);
      case 'manager-orders':        return p(<ManagerOrders onNavigate={navigate} />);
      case 'manager-order-details': return p(<ManagerOrderDetails onNavigate={navigate} />);
      case 'edit-order':            return p(<EditOrder onNavigate={navigate} />);
      case 'order-work-view':       return p(<OrderWorkView onNavigate={navigate} />);
      case 'completed-jobs':        return p(<CompletedJobs onNavigate={navigate} />);
      case 'batch-lookup':          return p(<BatchLookup onNavigate={navigate} />);
      case 'delivery-view-more':    return <DeliveryViewMore onNavigate={navigate} />;

      default: return p(<Login onNavigate={navigate} />);
    }
  };

  return (
    <NavigationContext.Provider value={{ goBack, canGoBack: navHistory.length > 0 }}>
      {renderPage()}
    </NavigationContext.Provider>
  );
}
