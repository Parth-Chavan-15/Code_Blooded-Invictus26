import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { Lock, UserCircle } from "lucide-react";

export default function Login() {
  // CHANGED: Initial state is now empty for a professional feel
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await api.post("/login", { username, password });
      localStorage.setItem("token", res.data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-100 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-gray-100">
        <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
              <Lock size={32} />
            </div>
        </div>
        <h2 className="text-3xl font-black text-center text-gray-800 mb-1 tracking-tight">INVICTUS</h2>
        <p className="text-center text-gray-500 font-medium mb-8">Secure Inventory Portal</p>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm font-bold text-center animate-pulse">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Admin ID</label>
            <div className="relative">
              <UserCircle size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-gray-700" 
                placeholder="Enter username"
                required 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-gray-700" 
              placeholder="Enter password"
              required 
            />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-xl mt-4 active:scale-95 disabled:bg-gray-400">
            {loading ? "Verifying Credentials..." : "Authenticate & Enter"}
          </button>
        </form>
        
        <p className="text-center text-xs text-gray-400 mt-6">
          Restricted Access • Electrolyte Solutions © 2026
        </p>
      </div>
    </div>
  );
}