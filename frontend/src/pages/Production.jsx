import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../services/api";

export default function Production() {
  const [pcbs, setPcbs] = useState([]);
  const [selectedPcb, setSelectedPcb] = useState("");
  const [quantity, setQuantity] = useState("");
  const [bomPreview, setBomPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  useEffect(() => {
    api.get('/pcbs').then(res => setPcbs(res.data)).catch(console.error);
  }, []);
  
  useEffect(() => {
    if (selectedPcb) {
      api.get(`/production/${selectedPcb}/bom`).then(res => setBomPreview(res.data));
    } else {
      setBomPreview([]);
    }
  }, [selectedPcb]);
  
  // [CHANGE: Updated parseInt(quantity) to parseInt(quantity, 10) for safety]
  const requirements = (!quantity || !bomPreview.length) ? [] : bomPreview.map(item => ({
    ...item,
    totalRequired: item.quantity_required * parseInt(quantity, 10),
    isShort: item.current_stock < (item.quantity_required * parseInt(quantity, 10))
  }));
  
  const hasShortage = requirements.some(r => r.isShort);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setMessage(null);
    try {
      const res = await api.post('/production/create', {
        pcbId: parseInt(selectedPcb, 10),
        quantityProduced: parseInt(quantity, 10)
      });
      setMessage({ type: "success", text: "Production batch verified and inventory updated!" });
      setTimeout(() => setMessage(null), 4000); // <-- ADD THIS LINE (Clears after 5 seconds)
      setQuantity(""); 
      setSelectedPcb(""); 
      setBomPreview([]);
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Transaction Blocked: ACID Rollback Executed" });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Production Entry & Netting Engine</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Select PCB Model</label>
                  <select value={selectedPcb} onChange={(e) => setSelectedPcb(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" required>
                    <option value="">Choose a PCB...</option>
                    {pcbs.map(pcb => <option key={pcb.id} value={pcb.id}>{pcb.pcb_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Production Quantity</label>
                  <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" required />
                </div>
              </div>

              {requirements.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden mt-8 shadow-sm">
                  <div className="bg-slate-800 px-6 py-4 border-b border-gray-200">
                    <h3 className="font-bold text-white tracking-wide">Live Deterministic Netting</h3>
                  </div>
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b">
                      <tr>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider">Component</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Required Total</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Available in Stock</th>
                        <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Status Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {requirements.map((req, idx) => (
                        <tr key={idx} className={req.isShort ? 'bg-red-50/80' : 'bg-white'}>
                          <td className="px-6 py-4 font-bold text-gray-800">{req.component_name}</td>
                          <td className="px-6 py-4 text-right font-black text-blue-600">{req.totalRequired}</td>
                          <td className="px-6 py-4 text-right font-medium text-gray-600">{req.current_stock}</td>
                          <td className="px-6 py-4 text-right font-bold">
                            {req.isShort ? <span className="text-red-600 bg-red-100 px-3 py-1 rounded-full">⚠️ Short by {req.totalRequired - req.current_stock}</span> : <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">✓ Sufficient</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {message && (
                <div className={`p-4 rounded-xl font-bold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                  {message.text}
                </div>
              )}

              <button type="submit" disabled={loading || hasShortage || !selectedPcb || !quantity} className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-md ${loading || hasShortage ? 'bg-gray-300 cursor-not-allowed text-gray-500 shadow-none' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}>
                {loading ? 'Executing ACID Transaction...' : hasShortage ? '⛔ HARD BLOCK: Insufficient Stock' : 'Execute Production & Deduct Inventory'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}