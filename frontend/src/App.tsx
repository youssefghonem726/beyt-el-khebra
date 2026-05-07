import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NavigationProvider } from './context/NavigationContext';
// Auth Pages
import Login from "./pages/auth/Login";
import CreateAccount from "./pages/auth/CreateAccount";
// Client Pages
import ClientDashboard from "./pages/client/ClientDashboard";
import MyOrders from "./pages/client/MyOrders";
// Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import Production from "./pages/owner/Production";
// Manager Pages
import ActiveJobs from "./pages/manager/ActiveJobs";
//devbypass
import TestLanding from "./pages/TestLanding";


// Layout wrapper
const Page = ({ children }: { children: React.ReactNode }) => (
  <div className="page">{children}</div>
);

// Role hierarchy — higher number = more access
export const ROLE_HIERARCHY: Record<string, number> = {
  client: 0,
  manager: 1,
  owner: 2,
};

// Shared utility: call this after login to get the right landing page
export function getRoleHomePage(role: string): string {
  if (role === "owner") return "/owner";
  if (role === "manager") return "/manager/jobs";
  return "/client";
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

  // DEV ONLY — bypass auth check
  if (import.meta.env.DEV) return <Outlet />;

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to={redirectTo} replace />;

  const role = user.app_metadata?.user_role ?? "client";
  const hasAccess = ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];

  if (!hasAccess) return <Navigate to={getRoleHomePage(role)} replace />;

  return <Outlet />;
}

export default function App() {
  return (
    <AuthProvider>
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
          </Route>

          {/* MANAGER — manager and owner only */}
          <Route element={<ProtectedRoute requiredRole="manager" />}>
            <Route path="/manager/jobs" element={<Page><ActiveJobs /></Page>} />
          </Route>

          {/* OWNER — owner only */}
          <Route element={<ProtectedRoute requiredRole="owner" />}>
            <Route path="/owner" element={<Page><OwnerDashboard /></Page>} />
            <Route path="/owner/production" element={<Page><Production /></Page>} />
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
       </NavigationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}