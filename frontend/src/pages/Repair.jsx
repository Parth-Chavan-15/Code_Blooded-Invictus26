import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../services/api";
import { Wrench, ArrowRightLeft, ShieldAlert } from "lucide-react";

export default function Repair() {
  const [inventory, setInventory] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState("");
  const [quantity, setQuantity] = useState("");
  
  // 'defect' mode (Scrap/Rework) vs 'recovery' mode (Recover back to active)
  const [mode, setMode] = useState("defect"); 
  const [actionType, setActionType] = useState("rework");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // FETCH LIVE INVENTORY
  // We call this on mount AND after every successful transaction
  const fetchInventory = async () => {
    try {
      // Adding timestamp prevents browser caching for "Real-Time" feel
      const res = await api.get(`/inventory?t=${Date.now()}`);
      setInventory(res.data);
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    }
  };

  useEffect(() => { 
    fetchInventory(); 
  }, []);

  // AUTO-HIDE MESSAGE LOGIC
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000); // Disappear after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); 
    // Don't clear message here immediately, let the new one replace it
    
    try {
      const res = await api.post('/inventory/repair', {
        componentId: parseInt(selectedComponent),
        quantity: parseInt(quantity),
        action: mode === 'recovery' ? 'recover' : actionType
      });
      setMessage({ type: "success", text: res.data.message });
      setQuantity("");
      setSelectedComponent("");
      
      // REAL-TIME UPDATE: Immediately refresh data so numbers change instantly
      await fetchInventory();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to log action." });
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode) => {
      setMode(newMode);
      setSelectedComponent("");
      setQuantity("");
      setMessage(null);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-orange-50 rounded-xl text-orange-600 border border-orange-100">
                  <Wrench size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Quality Control Lifecycle</h2>
                  <p className="text-sm font-medium text-gray-500">Manage defect isolation and part recovery</p>
                </div>
              </div>

              {/* MODE TOGGLE */}
              <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
                  <button 
                    onClick={() => handleModeSwitch('defect')} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${mode === 'defect' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <ShieldAlert size={18} /> Isolate Defects (Scrap/Rework)
                  </button>
                  <button 
                    onClick={() => handleModeSwitch('recovery')} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${mode === 'recovery' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                      <ArrowRightLeft size={18} /> Recover Fixed Parts
                  </button>
              </div>

              {/* MESSAGE BOX (Fades out automatically) */}
              {message && (
                <div className={`p-4 rounded-xl font-bold border mb-6 shadow-sm transition-opacity duration-500 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Select Component</label>
                    <select 
                      value={selectedComponent} 
                      onChange={(e) => setSelectedComponent(e.target.value)} 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                      required
                    >
                      <option value="">Choose a component...</option>
                      {inventory.map(item => (
                        <option key={item.id} value={item.id} disabled={mode === 'recovery' && item.quarantined_stock === 0}>
                          {item.component_name} (Active: {item.current_stock} | Quarantined: {item.quarantined_stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Quantity</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={quantity} 
                      onChange={(e) => setQuantity(e.target.value)} 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                      required 
                    />
                  </div>
                </div>

                {mode === 'defect' && (
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Maintenance Action</label>
                    <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 cursor-pointer font-bold transition-all ${actionType === 'rework' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                        <input type="radio" name="action" value="rework" checked={actionType === 'rework'} onChange={() => setActionType('rework')} className="hidden" />
                        Rework (Move to Quarantine)
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 cursor-pointer font-bold transition-all ${actionType === 'scrap' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                        <input type="radio" name="action" value="scrap" checked={actionType === 'scrap'} onChange={() => setActionType('scrap')} className="hidden" />
                        Scrap (Destroy/Discard)
                        </label>
                    </div>
                    </div>
                )}

                <button type="submit" disabled={loading || !selectedComponent || !quantity} className={`w-full py-4 mt-4 rounded-xl font-black text-white transition-all shadow-md ${loading || !selectedComponent || !quantity ? 'bg-gray-300 cursor-not-allowed shadow-none' : mode === 'recovery' ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg' : 'bg-gray-900 hover:bg-black hover:shadow-lg'}`}>
                  {loading ? 'Processing...' : mode === 'recovery' ? 'Recover Parts to Active Stock' : 'Isolate Parts from Active Stock'}
                </button>
              </form>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}