import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../services/api";
import { AlertTriangle, ShieldCheck, TrendingUp, Wrench, Activity, ListChecks, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Dashboard() {
  const [lowStock, setLowStock] = useState(null);
  const [consumption, setConsumption] = useState(null);
  const [maintStats, setMaintStats] = useState(null);
  
  // State for the QC Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qcDetails, setQcDetails] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stockRes, consRes, maintRes] = await Promise.all([
          api.get('/inventory/low-stock'),
          api.get('/inventory/consumption'),
          api.get('/inventory/maintenance-stats')
        ]);
        setLowStock(stockRes.data);
        setConsumption(consRes.data);
        setMaintStats(maintRes.data);
      } catch (error) { console.error("Fetch failed", error); }
    };
    fetchData();
  }, []);

  const openQcModal = async () => {
    setIsModalOpen(true);
    setLoadingModal(true);
    try {
      const res = await api.get('/inventory/maintenance-details');
      setQcDetails(res.data);
    } catch (err) {
      console.error("Failed to load QC Details");
    } finally {
      setLoadingModal(false);
    }
  };

  if (!lowStock || !consumption || !maintStats) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Activity className="text-blue-600 animate-spin mb-4" size={48} />
          <div className="text-xl font-bold text-gray-400 animate-pulse">Syncing Factory Telemetry...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans relative">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div>
                <h1 className="text-3xl font-black text-gray-800 tracking-tight uppercase">Enterprise Analytics</h1>
                <p className="text-gray-500 font-medium">Real-time Inventory & Production Metrics</p>
              </div>
              <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-bold">
                System Status: Online
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Consumption Bar Chart */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[450px]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600 border border-blue-100"><TrendingUp size={24} /></div>
                  <h2 className="text-lg font-bold text-gray-800">Consumption by Component</h2>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumption}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="component_name" hide />
                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: '#F9FAFB'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="total_consumed" fill="#3B82F6" radius={[6, 6, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Maintenance Pie Chart */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[450px] relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-50 rounded-xl text-orange-600 border border-orange-100"><Wrench size={24} /></div>
                    <h2 className="text-lg font-bold text-gray-800">Quality Control Metrics</h2>
                  </div>
                  {/* NEW DETAILS BUTTON */}
                  <button onClick={openQcModal} className="text-sm font-bold flex items-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                    <ListChecks size={16} /> View Audit Details
                  </button>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={maintStats} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                      {maintStats.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Procurement Alerts Table */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-red-50 rounded-xl text-red-600 border border-red-100"><AlertTriangle size={24} /></div>
                <h2 className="text-xl font-bold text-gray-800 tracking-tight">Procurement Triggers (Low Stock)</h2>
              </div>
              
              {lowStock.length === 0 ? (
                <div className="py-12 bg-emerald-50 rounded-2xl text-center border border-emerald-100 shadow-inner">
                  <ShieldCheck size={48} className="mx-auto text-emerald-500 mb-3" />
                  <p className="text-emerald-800 font-bold text-lg">All Inventory Levels Healthy</p>
                </div>
              ) : (
                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-5 font-bold text-gray-600 uppercase tracking-wider">Component</th>
                        <th className="px-6 py-5 font-bold text-gray-600 uppercase tracking-wider text-right">Current Stock</th>
                        <th className="px-6 py-5 font-bold text-gray-600 uppercase tracking-wider text-right">Target Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {lowStock.map((item, idx) => (
                        <tr key={idx} className="bg-white hover:bg-red-50/30 transition-colors">
                          <td className="px-6 py-5 font-bold text-gray-800">{item.component_name}</td>
                          <td className="px-6 py-5 text-right"><span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-black">{item.current_stock}</span></td>
                          <td className="px-6 py-5 text-right font-bold text-gray-500">{item.monthly_required}</td>
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

      {/* --- QC DETAILS MODAL OVERLAY --- */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-slate-50">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Quality Control Audit Trail</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {loadingModal ? (
                <div className="text-center font-bold text-gray-400 py-10 animate-pulse">Loading Audit Logs...</div>
              ) : qcDetails.length === 0 ? (
                <div className="text-center font-bold text-gray-500 py-10">No rework or scrap actions logged yet.</div>
              ) : (
                <table className="w-full text-sm text-left border border-gray-100 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Component</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {qcDetails.map((log, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{new Date(log.logged_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{log.component_name} <span className="text-xs text-gray-400 block">{log.part_number}</span></td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${log.action_type === 'scrap' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {log.action_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-gray-700">{log.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}