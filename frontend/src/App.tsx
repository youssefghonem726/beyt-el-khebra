import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NavigationProvider } from './context/NavigationContext';

// Auth Pages
import Login from "./pages/auth/Login";
import CreateAccount from "./pages/auth/CreateAccount";

// Client Pages
import ClientDashboard from "./pages/client/ClientDashboard";
import MyOrders from "./pages/client/MyOrders";
import ClientInvoices from "./pages/client/ClientInvoices";
import ClientOrderDetail from "./pages/client/ClientOrderDetail";
import ClientNotifications from "./pages/client/ClientNotifications";
import DocumentManagement from "./pages/client/DocumentManagement";
import InvoiceDetail from "./pages/client/InvoiceDetail";
import PlaceNewOrder from "./pages/client/PlaceNewOrder";
import ProfileSettings from "./pages/client/ProfileSettings";
import QuoteDetail from "./pages/client/QuoteDetail";
import Quotes from "./pages/client/Quotes";
import Support from "./pages/client/Support";
import TrackOrder from "./pages/client/TrackOrder";

// Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import Production from "./pages/owner/Production";
import Accounting from "./pages/owner/Accounting";
import ClientDetail from "./pages/owner/ClientDetail";
import DeliveryTracking from "./pages/owner/DeliveryTracking";
import ClientManagement from "./pages/owner/ClientManagement";
import OwnerNotifications from "./pages/owner/OwnerNotifications";
import OwnerSettings from "./pages/owner/OwnerSettings";
import UnpricedQueue from "./pages/owner/UnpricedQueue";
import OwnerPlaceOrder from "./pages/owner/OwnerPlaceOrder";

// Manager Pages
import ActiveJobs from "./pages/manager/ActiveJobs";
import BatchLookup from "./pages/manager/BatchLookup";
import CompletedJobs from "./pages/manager/CompletedJobs";
import DeliveryList from "./pages/manager/DeliveryList";
import DeliveryViewMore from "./pages/manager/DeliveryViewMore";
import EditOrder from "./pages/manager/EditOrder";
import ManagerOrderDetails from "./pages/manager/ManagerOrderDetails";
import ManagerOrders from "./pages/manager/ManagerOrders";
import OrderWorkView from "./pages/manager/OrderWorkView";

//devbypass
import TestLanding from "./pages/TestLanding";


// Layout wrapper
const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="page">{children}</div>
);

// Role hierarchy — higher number = more access
export const ROLE_HIERARCHY: Record<string, number> = {
  client: 0,
  staff: 1,
  manager: 1,
  owner: 2,
};

export function getRoleHomePage(role: string): string {
  const normalizedRole = role?.toLowerCase();

  if (normalizedRole === "owner") return "/owner";
  if (normalizedRole === "manager" || normalizedRole === "staff") return "/manager/jobs";

  return "/client";
}

export function getRoleFromAccessToken(accessToken?: string): string {
  if (!accessToken) return "client";

  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1]));
    return payload.user_role || "client";
  } catch {
    return "client";
  }
}

// Protected Route using AuthContext with bypass
function ProtectedRoute({
  requiredRole,
  redirectTo = "/login",
}: {
  requiredRole: string;
  redirectTo?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to={redirectTo} replace />;

  const authData = localStorage.getItem("sb-vmrgqbmsvuathzpelqzz-auth-token");
  const accessToken = authData ? JSON.parse(authData).access_token : undefined;
  const role = getRoleFromAccessToken(accessToken);

  const hasAccess = ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];

  if (!hasAccess) return <Navigate to={getRoleHomePage(role)} replace />;

  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
       <NavigationProvider>
        <Routes>
          {/* PUBLIC */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="/test" element={<TestLanding />} />

          {/* CLIENT — client, manager, owner */}
          <Route element={<ProtectedRoute requiredRole="client" />}>
            <Route path="/client" element={<Page><ClientDashboard /></Page>} />
            <Route path="/client/orders" element={<Page><MyOrders /></Page>} />
            <Route path="/client/invoices" element={<Page><ClientInvoices /></Page>} />
            <Route path="/client/orders/:id" element={<Page><ClientOrderDetail /></Page>} />
            <Route path="/client/notifications" element={<Page><ClientNotifications /></Page>} />
            <Route path="/client/documents" element={<Page><DocumentManagement /></Page>} />
            <Route path="/client/invoices/:id" element={<Page><InvoiceDetail /></Page>} />
            <Route path="/client/place-order" element={<Page><PlaceNewOrder /></Page>} />
            <Route path="/client/profile" element={<Page><ProfileSettings /></Page>} />
            <Route path="/client/quotes/:id" element={<Page><QuoteDetail /></Page>} />
            <Route path="/client/quotes" element={<Page><Quotes /></Page>} />
            <Route path="/client/support" element={<Page><Support /></Page>} />
            <Route path="/client/track-order/:id" element={<Page><TrackOrder /></Page>} />
            <Route path="/client/track-order" element={<Page><TrackOrder /></Page>} />
          </Route>

          {/* MANAGER — manager and owner only */}
          <Route element={<ProtectedRoute requiredRole="manager" />}>
            <Route path="/manager/jobs" element={<Page><ActiveJobs /></Page>} />
            <Route path="/manager/batch-lookup" element={<Page><BatchLookup /></Page>} />
            <Route path="/manager/completed" element={<Page><CompletedJobs /></Page>} />
            <Route path="/manager/deliveries" element={<Page><DeliveryList /></Page>} />
            <Route path="/manager/deliveries/:id" element={<Page><DeliveryViewMore /></Page>} />
            <Route path="/manager/orders/edit/:id" element={<Page><EditOrder /></Page>} />
            <Route path="/manager/orders/:id" element={<Page><ManagerOrderDetails /></Page>} />
            <Route path="/manager/orders" element={<Page><ManagerOrders /></Page>} />
            <Route path="/manager/work-view" element={<Page><OrderWorkView /></Page>} />
          </Route>

          {/* OWNER — owner only */}
          <Route element={<ProtectedRoute requiredRole="owner" />}>
            <Route path="/owner" element={<Page><OwnerDashboard /></Page>} />
            <Route path="/owner/production" element={<Page><Production /></Page>} />
            <Route path="/owner/accounting" element={<Page><Accounting /></Page>} />
            <Route path="/owner/clients/:id" element={<Page><ClientDetail /></Page>} />
            <Route path="/owner/delivery-tracking" element={<Page><DeliveryTracking /></Page>} />
            <Route path="/owner/clients" element={<Page><ClientManagement /></Page>} />
            <Route path="/owner/notifications" element={<Page><OwnerNotifications /></Page>} />
            <Route path="/owner/settings" element={<Page><OwnerSettings /></Page>} />
            <Route path="/owner/unpriced-queue" element={<Page><UnpricedQueue /></Page>} />
            <Route path="/owner/place-order" element={<Page><OwnerPlaceOrder /></Page>} />
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
       </NavigationProvider>
    </BrowserRouter>
  );
}