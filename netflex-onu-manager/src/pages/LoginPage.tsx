// src/pages/LoginPage.tsx
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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <img src={logo} alt="NETFLEX" className="h-12 w-auto mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">
            Sistema de Gerenciamento ONU/ONT
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Usuário
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Digite seu usuário"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-zinc-600 text-[10px] uppercase tracking-widest">
            © 2024 Netflex Telecom • v1.0.0
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
