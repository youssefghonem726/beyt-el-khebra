import { useLocation } from "react-router-dom";

const pageMap: Record<string, { title: string; description?: string }> = {
  "/": { title: "Dashboard", description: "Overview of your system" },
  "/accounting": { title: "Accounting" },
  "/clients": { title: "Clients" },
  "/production": { title: "Production" },
  "/queue": { title: "Unpriced Queue" },
  "/settings": { title: "Settings" },
};

const Topbar: React.FC = () => {
  const location = useLocation();
  const page = pageMap[location.pathname] || { title: "Page" };

  return (
    <div className="topbar bg-white border-b px-6 py-4 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-semibold">{page.title}</h1>
        {page.description && (
          <p className="text-sm text-gray-500">{page.description}</p>
        )}
      </div>

      <div className="topbar-user text-sm text-gray-600">
        Owner
      </div>
    </div>
  );
};

export default Topbar;