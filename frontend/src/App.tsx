import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import type { User } from "./data/credentials";

// Auth
import Login from "./pages/auth/Login";
import CreateAccount from "./pages/auth/CreateAccount";

// Layout wrapper (optional but clean)
const Page = ({ children }) => <div className="page">{children}</div>;

// RBAC Guard
const ProtectedRoute = ({ user, roles, children }) => {
  if (!user) return <Login />;

  if (roles && !roles.includes(user.role)) {
    return <div>403 Unauthorized</div>;
  }

  return children;
};

// Client Pages
import ClientDashboard from "./pages/client/ClientDashboard";
import MyOrders from "./pages/client/MyOrders";

// Owner Pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import Production from "./pages/owner/Production";

// Manager Pages
import ActiveJobs from "./pages/manager/ActiveJobs";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Login onLogin={setUser} />} />
        <Route path="/create-account" element={<CreateAccount />} />

        {/* CLIENT ROUTES */}
        <Route
          path="/client"
          element={
            <ProtectedRoute user={user} roles={["client"]}>
              <Page><ClientDashboard /></Page>
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/orders"
          element={
            <ProtectedRoute user={user} roles={["client"]}>
              <Page><MyOrders /></Page>
            </ProtectedRoute>
          }
        />

        {/* OWNER ROUTES */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute user={user} roles={["owner"]}>
              <Page><OwnerDashboard /></Page>
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/production"
          element={
            <ProtectedRoute user={user} roles={["owner"]}>
              <Page><Production /></Page>
            </ProtectedRoute>
          }
        />

        {/* MANAGER ROUTES */}
        <Route
          path="/manager/jobs"
          element={
            <ProtectedRoute user={user} roles={["manager"]}>
              <Page><ActiveJobs /></Page>
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<div>404 Not Found</div>} />

      </Routes>
    </BrowserRouter>
  );
}
