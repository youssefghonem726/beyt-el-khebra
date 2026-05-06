import { useState, useEffect } from 'react';
import { NavigationContext } from './context/NavigationContext';

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
import ClientOrderDetail from './pages/client/ClientOrderDetail';
import QuoteDetail from './pages/client/QuoteDetail';

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
import DeliveryList from './pages/manager/DeliveryList';

export default function App() {
  const [page, setPage] = useState('test-landing');
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [clientId, setClientId] = useState('client-detail-nagdi');
  const [invoiceId, setInvoiceId] = useState('');
  const [clientOrderId, setClientOrderId] = useState('');
  const [quoteDetailId, setQuoteDetailId] = useState('');
  const [workViewJobId, setWorkViewJobId] = useState('');
  const [managerOrderId, setManagerOrderId] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page]);

  const extractIds = (target: string) => {
    if (target.startsWith('client-detail-'))        setClientId(target);
    if (target.startsWith('invoice-detail-'))       setInvoiceId(target.replace('invoice-detail-', ''));
    if (target.startsWith('client-order-'))         setClientOrderId(target.replace('client-order-', ''));
    if (target.startsWith('quote-detail-'))         setQuoteDetailId(target.replace('quote-detail-', ''));
    if (target.startsWith('owner-work-view-'))      setWorkViewJobId(target.replace('owner-work-view-', ''));
    else if (target.startsWith('work-view-'))       setWorkViewJobId(target.replace('work-view-', ''));
    if (target.startsWith('manager-order-details-')) setManagerOrderId(target.replace('manager-order-details-', ''));
  };

  // In-page navigation: always pushes to history so ← Back works
  const navigate = (target: string) => {
    extractIds(target);
    setNavHistory(h => [...h, page]);
    setPage(target);
  };

  // Sidebar navigation: clears history (top-level, no back needed)
  const navigateTopLevel = (target: string) => {
    extractIds(target);
    setNavHistory([]);
    setPage(target);
  };

  const goBack = () => {
    if (navHistory.length === 0) return;
    const prev = navHistory[navHistory.length - 1];
    extractIds(prev);
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

      // Client order detail
      case 'client-order-1021':
      case 'client-order-1020':
      case 'client-order-1018':
      case 'client-order-1015':
      case 'client-order-1012':
        return p(<ClientOrderDetail onNavigate={navigate} orderId={clientOrderId} />);

      // Quote detail
      case 'quote-detail-Q-211':
      case 'quote-detail-Q-208':
        return p(<QuoteDetail onNavigate={navigate} quoteId={quoteDetailId} />);

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
      case 'client-detail-nagdi':
      case 'client-detail-design-hub':
      case 'client-detail-retail-plus':
        return p(<ClientDetail onNavigate={navigate} clientId={clientId} />);
      case 'owner-manager-orders':   return p(<ManagerOrders onNavigate={navigate} role="owner" />);
      case 'owner-completed-jobs':   return p(<CompletedJobs onNavigate={navigate} role="owner" />);
      case 'owner-batch-lookup':     return p(<BatchLookup onNavigate={navigate} role="owner" />);
      case 'owner-work-view-1022':
      case 'owner-work-view-1021':
      case 'owner-work-view-1020':
      case 'owner-work-view-1019':
        return p(<OrderWorkView onNavigate={navigate} jobId={workViewJobId} role="owner" />);

      // Manager
      case 'active-jobs':           return p(<ActiveJobs onNavigate={navigate} />);
      case 'manager-orders':        return p(<ManagerOrders onNavigate={navigate} />);
      case 'manager-order-details': return p(<ManagerOrderDetails onNavigate={navigate} orderId={managerOrderId} />);
      case 'manager-order-details-1033':
      case 'manager-order-details-1031':
      case 'manager-order-details-1024':
      case 'manager-order-details-1020':
        return p(<ManagerOrderDetails onNavigate={navigate} orderId={managerOrderId} />);
      case 'edit-order':            return p(<EditOrder onNavigate={navigate} />);
      case 'order-work-view':       return p(<OrderWorkView onNavigate={navigate} />);
      case 'work-view-1022':
      case 'work-view-1021':
      case 'work-view-1029':
      case 'work-view-1026':
        return p(<OrderWorkView onNavigate={navigate} jobId={workViewJobId} />);
      case 'completed-jobs':        return p(<CompletedJobs onNavigate={navigate} />);
      case 'batch-lookup':          return p(<BatchLookup onNavigate={navigate} />);
      case 'delivery-list':         return p(<DeliveryList onNavigate={navigate} />);
      case 'delivery-view-more':    return <DeliveryViewMore onNavigate={navigate} />;

      default: return p(<Login onNavigate={navigate} />);
    }
  };

  return (
    <NavigationContext.Provider value={{ goBack, canGoBack: navHistory.length > 0, navigateTopLevel }}>
      {renderPage()}
    </NavigationContext.Provider>
  );
}
