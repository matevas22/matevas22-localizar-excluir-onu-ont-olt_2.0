// src/pages/LoginPage.tsx
import "../styles/LoginPage.css";
import React, { useState } from "react";
import { motion } from "motion/react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import { UserData } from "../types";
import logo from "../img/logo/logo-white.png";

interface LoginPageProps {
  onLogin: (data: { token: string; user: UserData }) => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { username, password });

      const token = res.data.access_token || res.data.token;

      if (!token) {
        throw new Error("Token não recebido do servidor");
      }

      const loginData = {
        token: token,
        user: res.data.user,
      };

      onLogin(loginData);
      toast.success("Bem-vindo ao Netflex!");
    } catch (err: any) {
      console.error("Login error:", err);
      let errorMessage = "Erro ao fazer login";

      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = "Usuário ou senha incorretos";
        } else if (err.response.data?.msg) {
          errorMessage = err.response.data.msg;
        } else if (err.response.data?.error) {
          errorMessage = err.response.data.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="login-card"
      >
        <div className="login-header">
          <img src={logo} alt="NETFLEX" className="login-logo" />
          <p className="login-subtitle">Sistema de Gerenciamento ONU/ONT</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div>
            <label className="form-label">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="Digite seu usuário"
              required
            />
          </div>
          <div>
            <label className="form-label">Senha</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle-btn"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="login-submit-btn">
            {loading ? <Loader2 className="spinner" size={20} /> : "Entrar"}
          </button>
        </form>

        <div className="login-footer">
          <p className="footer-text">© 2024 Netflex Telecom • v1.0.0</p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
