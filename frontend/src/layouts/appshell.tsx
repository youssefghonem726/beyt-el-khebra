import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";
import Topbar from "./topbar";

const AppShell: React.FC = () => {
  return (
    <div className="app-shell flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="main flex flex-col flex-1 overflow-hidden">
        <Topbar />

        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AppShell;