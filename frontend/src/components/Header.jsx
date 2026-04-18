import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  
  return (
    <header className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center z-10">
      <h1 className="text-xl font-bold text-gray-800">Manufacturing Control Panel</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Admin Status: Active</span>
        <button onClick={handleLogout} className="text-sm font-bold text-red-600 hover:text-red-800 px-4 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
          Log Out
        </button>
      </div>
    </header>
  );
}