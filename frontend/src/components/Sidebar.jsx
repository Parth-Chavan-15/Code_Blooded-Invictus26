import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Factory, Database, Wrench, FileSpreadsheet } from "lucide-react";

export default function Sidebar() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "bg-slate-800 border-l-4 border-blue-500 text-white" : "hover:bg-slate-800 text-gray-400 hover:text-white";

  return (
    <div className="w-64 bg-[#0F172A] text-white h-screen flex flex-col shadow-2xl relative z-20">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-2xl font-black tracking-wider text-blue-400">CODE BLOODED</h2>
        <p className="text-xs text-slate-400 mt-1">Electrolyte Solutions - Inventory Manager</p>
      </div>
      <nav className="flex-1 py-6 space-y-2 font-medium">
        <Link to="/" className={`flex items-center gap-3 px-6 py-3 transition-colors ${isActive('/')}`}>
          <LayoutDashboard size={20} /> Analytics Dashboard
        </Link>
        {/* NEW INVENTORY MASTER TAB */}
        <Link to="/inventory" className={`flex items-center gap-3 px-6 py-3 transition-colors ${isActive('/inventory')}`}>
          <Database size={20} /> Inventory Master
        </Link>
        <Link to="/production" className={`flex items-center gap-3 px-6 py-3 transition-colors ${isActive('/production')}`}>
          <Factory size={20} /> Production Engine
        </Link>
        <Link to="/repair" className={`flex items-center gap-3 px-6 py-3 transition-colors ${isActive('/repair')}`}>
          <Wrench size={20} /> Repair & Rework
        </Link>
        <Link to="/intake" className={`flex items-center gap-3 px-6 py-3 transition-colors ${isActive('/intake')}`}>
          <FileSpreadsheet size={20} /> Inventory Intake
        </Link>
      </nav>
    </div>
  );
}