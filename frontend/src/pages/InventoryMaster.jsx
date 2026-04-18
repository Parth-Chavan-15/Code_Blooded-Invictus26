import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../services/api";
import * as XLSX from "xlsx";
import { Database, FileDown, Search } from "lucide-react";

export default function InventoryMaster() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchInventory = () => {
    // Adding timestamp to force fresh data load
    api.get(`/inventory?t=${Date.now()}`)
       .then(res => { setInventory(res.data); setLoading(false); })
       .catch(console.error);
  };

  useEffect(() => { 
    fetchInventory(); 
  }, []);

  const handleExport = async () => {
    try {
      const [consRes, maintRes] = await Promise.all([
        api.get('/inventory/consumption'),
        api.get('/inventory/maintenance-details')
      ]);

      // --- INDUSTRY GRADE EXPORT with QUARANTINE DATA ---
      const masterSheet = inventory.map(item => ({
        "Part Number": item.part_number,
        "Component Name": item.component_name,
        "Live Active Stock": item.current_stock,
        "Quarantined Stock": item.quarantined_stock || 0, // NEW FIELD
        "Monthly Target": item.monthly_required,
        "Stock Status": item.is_low_stock ? "CRITICAL" : "HEALTHY"
      }));

      const consumptionSheet = consRes.data.map(item => ({ 
        "Component Name": item.component_name, 
        "Total Quantity Consumed": item.total_consumed 
      }));
      
      const qcSheet = maintRes.data.map(item => ({ 
        "Date Logged": new Date(item.logged_at).toLocaleDateString(), 
        "Part Number": item.part_number, 
        "Component Name": item.component_name, 
        "Action": item.action_type.toUpperCase(), 
        "Quantity": item.quantity 
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(masterSheet), "Master Inventory");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(consumptionSheet), "Consumption History");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(qcSheet), "QC & Scrap Logs");
      
      XLSX.writeFile(wb, `Invictus_Factory_Audit.xlsx`);
    } catch (error) { 
      alert("Failed to compile full factory report."); 
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.component_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.part_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
                  <Database size={28} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Inventory Master</h1>
                  <p className="text-sm font-medium text-gray-500">Global View of Factory Components</p>
                </div>
              </div>
              <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md">
                <FileDown size={20} /> Generate Master Audit (.xlsx)
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-800 tracking-wide text-lg">Active Stock Directory</h3>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder="Search by name or part no..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 w-72" />
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-gray-500 font-bold animate-pulse">Loading Database...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider">Part Number</th>
                        <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider">Component Name</th>
                        <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-right">Active Stock</th>
                        {/* NEW QUARANTINE HEADER */}
                        <th className="px-6 py-4 font-bold text-orange-600 uppercase tracking-wider text-right">Quarantined</th>
                        <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-right">Monthly Target</th>
                        <th className="px-6 py-4 font-bold text-gray-600 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredInventory.map((item) => (
                        <tr key={item.id} className="bg-white hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-gray-500">{item.part_number}</td>
                          <td className="px-6 py-4 font-bold text-gray-800">{item.component_name}</td>
                          <td className="px-6 py-4 text-right font-black text-blue-600">{item.current_stock}</td>
                          
                          {/* NEW QUARANTINE DATA CELL */}
                          <td className="px-6 py-4 text-right font-bold text-orange-500">
                            {item.quarantined_stock > 0 ? item.quarantined_stock : "-"}
                          </td>
                          
                          <td className="px-6 py-4 text-right font-semibold text-gray-500">{item.monthly_required}</td>
                          <td className="px-6 py-4 text-center">
                            {item.is_low_stock ? (
                              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold text-xs">CRITICAL</span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold text-xs">HEALTHY</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}