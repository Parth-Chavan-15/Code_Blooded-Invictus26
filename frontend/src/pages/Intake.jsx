import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../services/api";
import * as XLSX from "xlsx";
import { FileSpreadsheet, UploadCloud, PlusCircle, AlertOctagon } from "lucide-react";

export default function Intake() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [manualForm, setManualForm] = useState({ part_number: "", component_name: "", current_stock: "", monthly_required: "" });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, { type: "binary" });
      const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      setData(json);
    };
    reader.readAsBinaryString(file);
  };

  const submitExcel = async () => {
    if (data.length === 0) return;
    
    // --- ADDITION 1: The Strict Excel Confirmation Warning ---
    const confirmMsg = "CONFIRM INTAKE RULES:\n\n1. For NEW components, the Monthly Target will be locked upon creation.\n2. For EXISTING components, the Monthly Target in this Excel sheet will be safely discarded to protect data integrity.\n\nOnly a Super Admin can modify established targets. Proceed with upload?";
    if (!window.confirm(confirmMsg)) return; // Halts execution if they click Cancel

    setLoading(true); setMessage(null);
    try {
      const res = await api.post('/inventory/bulk-intake', { items: data });
      setMessage({ type: "success", text: res.data.message });
      setData([]); 
      document.getElementById('excel-upload').value = ""; 
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Database rejected the Excel payload." });
    } finally {
      setLoading(false);
    }
  };

  const submitManual = async (e) => {
    e.preventDefault();
    
    const finalPartNumber = manualForm.part_number.trim();
    if (!finalPartNumber) {
        setMessage({ type: "error", text: "Part Number is strictly required by engineering." });
        return;
    }

    // --- ADDITION 2: The Strict Manual Confirmation Warning ---
    const confirmMsg = `Confirm Intake for ${finalPartNumber}:\n\nIf this is a new item, the Monthly Target will be permanently set. If this item already exists, your target entry will be ignored.\n\nModifications to existing targets require Super Admin clearance. Proceed?`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true); setMessage(null);
    try {
      const itemToSubmit = {
        part_number: finalPartNumber,
        component_name: manualForm.component_name,
        current_stock: parseInt(manualForm.current_stock),
        monthly_required: parseInt(manualForm.monthly_required)
      };
      
      await api.post('/inventory/bulk-intake', { items: [itemToSubmit] });
      setMessage({ type: "success", text: `Successfully logged ${finalPartNumber} into inventory.` });
      setManualForm({ part_number: "", component_name: "", current_stock: "", monthly_required: "" }); 
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to add manual entry." });
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
          <div className="max-w-7xl mx-auto">
            
            <div className="flex items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="p-3 bg-green-50 rounded-xl text-green-600 border border-green-100">
                <FileSpreadsheet size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Inventory Intake</h2>
                <p className="text-sm font-medium text-gray-500">Add new components via Bulk Excel Manifest or Manual Entry</p>
              </div>
            </div>

            {message && (
              <div className={`p-4 rounded-xl font-bold border mb-8 shadow-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {/* LEFT COLUMN: EXCEL UPLOAD */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
                <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2"><UploadCloud size={20}/> Bulk Excel Upload</h3>
                
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors mb-4">
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" id="excel-upload" />
                  <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
                    <UploadCloud size={40} className="text-gray-400 mb-3" />
                    <span className="text-blue-600 font-bold hover:underline">Click to browse for Excel file</span>
                    <span className="text-xs text-gray-500 mt-1">Headers required: part_number, component_name, current_stock</span>
                  </label>
                </div>

                {/* ADDITION 3: Excel Disclaimer */}
                <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200 text-xs font-semibold mb-6">
                  <AlertOctagon size={16} className="mt-0.5 flex-shrink-0" />
                  <p>System Note: If a component already exists in the database, the Monthly Target specified in the Excel sheet will be securely discarded. Contact Super Admin for target modifications.</p>
                </div>

                {data.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6 flex-1 flex flex-col">
                    <div className="bg-slate-800 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-bold text-white text-sm tracking-wide">Data Preview ({data.length} rows)</h3>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-500 sticky top-0">
                          <tr>
                            {Object.keys(data[0]).slice(0, 4).map((key, idx) => (
                              <th key={idx} className="px-4 py-3 font-bold uppercase tracking-wider">{key}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.map((row, idx) => (
                            <tr key={idx} className="bg-white hover:bg-gray-50">
                              {Object.values(row).slice(0, 4).map((val, i) => (
                                <td key={i} className="px-4 py-2 text-gray-700 font-medium truncate max-w-[150px]">{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <button onClick={submitExcel} disabled={loading || data.length === 0} className={`w-full py-4 rounded-xl font-black text-white transition-all shadow-md mt-auto ${loading || data.length === 0 ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'}`}>
                  {loading ? 'Processing...' : `Commit ${data.length} Rows to Database`}
                </button>
              </div>

              {/* RIGHT COLUMN: MANUAL ENTRY */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
                <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2"><PlusCircle size={20}/> Manual Entry</h3>
                
                <form onSubmit={submitManual} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Part Number (Required)</label>
                    <input type="text" placeholder="e.g. RES-10K-0805" value={manualForm.part_number} onChange={e => setManualForm({...manualForm, part_number: e.target.value})} className="w-full px-4 py-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Component Name / Description</label>
                    <input type="text" placeholder="e.g. 10uF Capacitor" value={manualForm.component_name} onChange={e => setManualForm({...manualForm, component_name: e.target.value})} className="w-full px-4 py-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Initial Stock</label>
                      <input type="number" min="0" value={manualForm.current_stock} onChange={e => setManualForm({...manualForm, current_stock: e.target.value})} className="w-full px-4 py-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Monthly Target</label>
                      <input type="number" min="1" value={manualForm.monthly_required} onChange={e => setManualForm({...manualForm, monthly_required: e.target.value})} className="w-full px-4 py-3 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" required />
                    </div>
                  </div>

                  {/* ADDITION 4: Manual Form Disclaimer */}
                  <div className="flex items-start gap-2 bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-200 text-xs font-semibold">
                    <AlertOctagon size={16} className="mt-0.5 flex-shrink-0" />
                    <p>Note: The Monthly Target entered above will only be applied if this is a brand new part. For existing items, this field is ignored.</p>
                  </div>

                  <button type="submit" disabled={loading} className={`w-full py-4 mt-2 rounded-xl font-black text-white transition-all shadow-md ${loading ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}`}>
                    Add Single Component
                  </button>
                </form>
              </div>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}