import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Production from "./pages/Production";
import Intake from "./pages/Intake";
import Repair from "./pages/Repair";
import InventoryMaster from "./pages/InventoryMaster";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={
        localStorage.getItem("token")
          ? <Navigate to="/" replace />
          : <Login />
      } />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><InventoryMaster /></ProtectedRoute>} />
      <Route path="/production" element={<ProtectedRoute><Production /></ProtectedRoute>} />
      <Route path="/repair" element={<ProtectedRoute><Repair /></ProtectedRoute>} />
      <Route path="/intake" element={<ProtectedRoute><Intake /></ProtectedRoute>} />
    </Routes>
  );
}