import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/App.css";
import { Loader2 } from "lucide-react";
import api from "./services/api";

// Pages
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import LocateOnu from "./pages/LocateOnu";
import Diagnosis from "./pages/Diagnosis";
import OLTManager from "./pages/OLTManager";
import Profile from "./pages/Profile";
import AdminPanel from "./pages/AdminPanel";

import Sidebar from "./components/Sidebar";

import { UserData, PageState } from "./types";

interface LoginPayload {
  token: string;
  user: UserData;
}

const AppContent = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [locateState, setLocateState] = useState<PageState>({
    sn: "",
    loading: false,
    result: null,
    controller: null,
  });

  const [diagnosisState, setDiagnosisState] = useState<PageState>({
    sn: "",
    loading: false,
    result: null,
    controller: null,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("username");
      const storedRole = localStorage.getItem("role");
      const storedId = localStorage.getItem("id");

      if (token && storedUser && storedRole && storedId) {
        try {
          await api.get("/auth/check");
          setUser({
            id: parseInt(storedId),
            username: storedUser,
            role: storedRole as "admin" | "tech",
          });
        } catch (error) {
          console.error("Auth check failed", error);
          localStorage.clear();
          setUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (data: LoginPayload) => {
    setUser(data.user);
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.user.username);
    localStorage.setItem("role", data.user.role);
    localStorage.setItem("id", data.user.id.toString());
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="app-loading-container">
        <Loader2 className="app-loader-icon" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar user={user} onLogout={handleLogout} />

      <main className="app-main">
        <div className="app-content-wrapper custom-scrollbar">
          <div className="app-container">
            <Routes>
              <Route path="/home" element={<Dashboard />} />
              <Route
                path="/locate"
                element={
                  <LocateOnu state={locateState} setState={setLocateState} />
                }
              />
              <Route
                path="/diagnosis"
                element={
                  <Diagnosis
                    state={diagnosisState}
                    setState={setDiagnosisState}
                  />
                }
              />
              <Route
                path="/olts"
                element={
                  user.role === "admin" ? (
                    <OLTManager />
                  ) : (
                    <Navigate to="/home" />
                  )
                }
              />
              <Route path="/profile" element={<Profile />} />
              <Route
                path="/admin"
                element={
                  user.role === "admin" ? (
                    <AdminPanel />
                  ) : (
                    <Navigate to="/home" />
                  )
                }
              />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AppContent />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          backgroundColor: "#141414",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
        }}
      />
    </Router>
  );
}
