/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import {
  LayoutDashboard,
  Search,
  Activity,
  User,
  Settings,
  LogOut,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Menu,
  X,
  Key,
  Users,
  History,
  TrendingUp,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "motion/react";

// --- Types ---

interface UserData {
  id: number;
  username: string;
  role: "admin" | "tech";
}

interface OnuResult {
  sn: string;
  olt: string;
  ip: string;
  interface: string;
  status: string;
  name?: string;
  distance?: string;
  uptime?: string;
  signals: {
    rxOnu: number;
    txOnu: number;
    rxOlt: number;
    txOlt: number;
  };
}

interface PageState {
  sn: string;
  loading: boolean;
  result: OnuResult | null;
  controller: AbortController | null;
}

interface PageProps {
  state: PageState;
  setState: React.Dispatch<React.SetStateAction<PageState>>;
}

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 422)
    ) {
      if (
        !error.config.url.includes("/auth/login") &&
        !window.location.pathname.includes("/login")
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

const LoginPage = ({
  onLogin,
}: {
  onLogin: (data: { token: string; user: UserData }) => void;
}) => {
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
          <h1 className="text-4xl font-bold text-emerald-500 mb-2 tracking-tighter">
            NETFLEX
          </h1>
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

const Sidebar = ({
  user,
  onLogout,
}: {
  user: UserData;
  onLogout: () => void;
}) => {
  const location = useLocation();
  const navItems = [
    {
      path: "/home",
      icon: LayoutDashboard,
      label: "Painel",
      roles: ["tech", "admin"],
    },
    {
      path: "/locate",
      icon: Search,
      label: "Localizar",
      roles: ["tech", "admin"],
    },
    {
      path: "/diagnosis",
      icon: Activity,
      label: "Sinal",
      roles: ["tech", "admin"],
    },
    {
      path: "/olts",
      icon: Settings,
      label: "OLTs",
      roles: ["admin"],
    },
    { path: "/profile", icon: User, label: "Perfil", roles: ["tech", "admin"] },
    { path: "/admin", icon: Shield, label: "Admin", roles: ["admin"] },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-[#0a0a0a] border-r border-white/10 flex-col h-screen sticky top-0">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-emerald-500 tracking-tighter">
            NETFLEX
          </h2>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  location.pathname === item.path
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.username}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {user.role}
              </p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#141414]/80 backdrop-blur-xl border-t border-white/10 px-2 py-2 z-50 flex justify-around items-center">
        {navItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                location.pathname === item.path
                  ? "text-emerald-500"
                  : "text-zinc-500"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">
                {item.label}
              </span>
            </Link>
          ))}
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-1 p-2 text-red-500/70"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-bold uppercase tracking-tighter">
            Sair
          </span>
        </button>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 z-50 flex justify-between items-center">
        <h2 className="text-xl font-bold text-emerald-500 tracking-tighter">
          NETFLEX
        </h2>
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-xs">
          {user.username[0].toUpperCase()}
        </div>
      </div>
    </>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, recentRes] = await Promise.all([
          api.get("/user/stats"),
          api.get("/user/recent"),
        ]);
        setStats(statsRes.data);
        setRecentLogs(recentRes.data);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const COLORS = [
    "#10b981",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#6366f1",
  ];

  const totalActions = stats.reduce((acc, curr) => acc + curr.count, 0);
  const mostFrequent = stats.length > 0 ? stats[0].action : "-";

  const CustomPieLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return percent > 0.05 ? (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    ) : null;
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Painel de Controle
        </h1>
        <p className="text-zinc-400">
          Visão geral das suas atividades recentes.
        </p>
      </header>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                Total de Ações
              </p>
              <h4 className="text-2xl font-bold text-white">{totalActions}</h4>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                Mais Frequente
              </p>
              <h4
                className="text-xl font-bold text-white truncate max-w-[150px]"
                title={mostFrequent}
              >
                {mostFrequent}
              </h4>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                Status do Sistema
              </p>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                <h4 className="text-xl font-bold text-white">Online</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
              <Settings size={24} />
            </div>
            <div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                Versão
              </p>
              <h4 className="text-2xl font-bold text-white">v1.0.2</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <History size={20} className="text-emerald-500" />
              Resumo de Volume
            </h3>
            <div className="flex-1 min-h-[300px]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-emerald-500" />
                </div>
              ) : stats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={stats}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="action"
                      stroke="#52525b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => val.split(" ")[0]} // Show only first word on axis
                    />
                    <YAxis
                      stroke="#52525b"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      contentStyle={{
                        backgroundColor: "#141414",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                      }}
                      labelStyle={{
                        color: "#fff",
                        fontWeight: "bold",
                        marginBottom: "0.5rem",
                      }}
                      formatter={(value: number) => [`${value}`, "Total"]}
                    />
                    <Bar
                      dataKey="count"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    >
                      {stats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 italic">
                  Nenhuma atividade registrada ainda.
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity size={20} className="text-emerald-500" />
                Atividade Recente
              </h3>
              <Link
                to="/profile"
                className="text-xs text-emerald-500 hover:text-emerald-400 font-bold uppercase tracking-wider hover:underline"
              >
                Ver tudo
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-white/5 transition-colors flex items-start gap-4"
                  >
                    <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400 mt-1">
                      <Activity size={16} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="text-white font-medium text-sm">
                          {log.action}
                        </h4>
                        <span className="text-zinc-500 text-xs font-mono">
                          {new Date(log.timestamp).toLocaleDateString()}{" "}
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs line-clamp-1">
                        {log.details}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 italic text-sm">
                  Nenhuma atividade recente.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Pie Chart & Actions */}
        <div className="space-y-6">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col h-[400px]">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500" />
              Categorias
            </h3>
            <div className="flex-1 flex flex-col justify-center items-center">
              {loading ? (
                <Loader2 className="animate-spin text-emerald-500" />
              ) : stats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="action"
                      labelLine={false}
                      label={CustomPieLabel}
                    >
                      {stats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#141414",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                      }}
                      itemStyle={{ color: "#fff", fontWeight: 500 }}
                      formatter={(value: number) => [
                        `${value} ações`,
                        "Quantidade",
                      ]}
                      labelStyle={{ color: "#a1a1aa", marginBottom: "0.5rem" }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-zinc-500 italic flex flex-col items-center gap-2">
                  <Activity size={32} className="opacity-20" />
                  <span>Sem dados gráficos.</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-500/20 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Acesso Rápido
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/locate"
                className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <Search
                  className="text-emerald-500 group-hover:scale-110 transition-transform"
                  size={24}
                />
                <span className="text-xs font-bold text-emerald-400 uppercase">
                  Localizar
                </span>
              </Link>
              <Link
                to="/diagnosis"
                className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all group"
              >
                <Activity
                  className="text-blue-500 group-hover:scale-110 transition-transform"
                  size={24}
                />
                <span className="text-xs font-bold text-blue-400 uppercase">
                  Diagnóstico
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LocateOnu = ({ state, setState }: PageProps) => {
  const { sn, loading, result } = state;

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSn = sn.trim();
    if (cleanSn.length !== 12) {
      toast.warn("O SN deve ter exatamente 12 caracteres.");
      return;
    }

    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, result: null, controller }));

    try {
      const res = await api.post(
        "/onu/locate",
        { sn: cleanSn },
        { signal: controller.signal },
      );
      setState((prev) => ({ ...prev, result: res.data, loading: false }));
    } catch (err: any) {
      if (axios.isCancel(err)) {
        // Request cancelled
      } else {
        toast.error(err.response?.data?.error || "Erro ao localizar ONU");
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
  };

  const handleCancel = () => {
    if (state.controller) {
      state.controller.abort();
      setState((prev) => ({ ...prev, loading: false, controller: null }));
    }
  };

  const setSn = (value: string) => {
    setState((prev) => ({ ...prev, sn: value.toUpperCase() }));
  };

  const handleDelete = async () => {
    if (!result) return;
    try {
      await api.delete(`/onu/${result.sn}`);
      toast.success("ONU excluída com sucesso!");
      setState((prev) => ({ ...prev, result: null }));
      setShowDeleteModal(false);
    } catch (err) {
      toast.error("Erro ao excluir ONU");
    }
  };

  const examples = [
    { sn: "ZTEG12345678", label: "ZTE" },
    { sn: "HWTC87654321", label: "Huawei" },
    { sn: "ALCL1A2B3C4D", label: "Alcatel" },
    { sn: "NETF00000001", label: "Netflex" },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <header>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          Localizar ONU
        </h1>
        <p className="text-zinc-400 text-sm">Busque equipamentos na rede.</p>
      </header>

      <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 lg:p-6">
        <form
          onSubmit={handleSearch}
          className="flex flex-col lg:flex-row gap-4 mb-4"
        >
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              size={20}
            />
            <input
              type="text"
              value={sn}
              onChange={(e) => setSn(e.target.value)}
              maxLength={12}
              placeholder="Número de Série (12 caracteres)"
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors uppercase font-mono text-sm lg:text-base"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white py-3 lg:px-8 rounded-xl font-bold transition-all flex items-center justify-center gap-2 flex-1 lg:flex-none"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Buscar"
              )}
            </button>
            {loading && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-red-600 hover:bg-red-500 text-white py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center"
                title="Cancelar busca"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold flex items-center mr-2">
            Exemplos:
          </span>
          {examples.map((ex) => (
            <button
              key={ex.sn}
              onClick={() => {
                setSn(ex.sn);
              }}
              className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 px-2 py-1 rounded border border-white/5 transition-colors font-mono"
            >
              {ex.sn} ({ex.label})
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden"
          >
            <div className="p-4 lg:p-6 border-b border-white/5 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white/5 gap-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="text-emerald-500" size={20} />
                  Equipamento Localizado
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-1">
                  {result.sn}
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full lg:w-auto flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 px-4 py-2 rounded-lg transition-all text-sm font-bold"
              >
                <Trash2 size={16} />
                Excluir ONU
              </button>
            </div>

            <div className="p-4 lg:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  OLT
                </p>
                <p className="text-white font-medium">{result.olt}</p>
                <p className="text-xs text-zinc-400 font-mono">{result.ip}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  Interface
                </p>
                <p className="text-white font-medium font-mono text-sm">
                  {result.interface}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  Status
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${result.status === "Working" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`}
                  />
                  <p
                    className={`font-medium ${result.status === "Working" ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {result.status === "Working" ? "Operando" : result.status}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  Ação
                </p>
                <Link
                  to={`/diagnosis?sn=${result.sn}`}
                  className="text-emerald-500 hover:underline text-sm font-medium flex items-center gap-1"
                >
                  Ver Diagnóstico <Activity size={14} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-8 shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">
              Confirmar Exclusão
            </h3>
            <p className="text-zinc-400 text-center mb-8">
              Você está prestes a excluir o equipamento{" "}
              <span className="text-white font-mono">{result?.sn}</span> da
              interface{" "}
              <span className="text-white font-mono">{result?.interface}</span>.
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const Diagnosis = ({ state, setState }: PageProps) => {
  const { sn, loading, result } = state;
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const snParam = params.get("sn");
    if (snParam && snParam !== sn && !loading && !result) {
      setState((prev) => ({ ...prev, sn: snParam }));
      fetchDiagnosis(snParam);
    }
  }, [location, sn, loading, result]);

  const setSn = (value: string) => {
    setState((prev) => ({ ...prev, sn: value }));
  };

  const fetchDiagnosis = async (searchSn: string) => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, result: null, controller }));

    try {
      const res = await api.get(`/onu/signal/${searchSn}`, {
        signal: controller.signal,
      });
      setState((prev) => ({ ...prev, result: res.data, loading: false }));
    } catch (err: any) {
      if (axios.isCancel(err)) {
        // Request canceled
      } else {
        toast.error(err.response?.data?.error || "Erro ao obter sinais");
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
  };

  const handleCancel = () => {
    if (state.controller) {
      state.controller.abort();
      setState((prev) => ({ ...prev, loading: false, controller: null }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSn = state.sn.trim();
    if (cleanSn.length !== 12) {
      toast.warn("O SN deve ter exatamente 12 caracteres.");
      return;
    }
    fetchDiagnosis(cleanSn);
  };

  const getSignalColor = (val: number, type: "rx" | "tx") => {
    if (type === "rx") {
      if (val < -28 || val > -8) return "text-red-500";
      if (val < -25) return "text-yellow-500";
      return "text-emerald-500";
    }
    return "text-emerald-500";
  };

  const examples = [
    { sn: "ZTEG12345678", label: "ZTE" },
    { sn: "HWTC87654321", label: "Huawei" },
    { sn: "ALCL1A2B3C4D", label: "Alcatel" },
    { sn: "NETF00000001", label: "Netflex" },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Diagnóstico de Sinal
        </h1>
        <p className="text-zinc-400">
          Verifique os níveis de sinal óptico em tempo real.
        </p>
      </header>

      <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Activity
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              size={20}
            />
            <input
              type="text"
              value={sn}
              onChange={(e) => setSn(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder="Digite o Número de Série para diagnóstico"
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors uppercase font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white px-8 rounded-xl font-bold transition-all flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Verificar"
              )}
            </button>
            {loading && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-red-600 hover:bg-red-500 text-white px-4 rounded-xl font-bold transition-all flex items-center justify-center"
                title="Cancelar verificação"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] text-zinc-500 uppercase font-bold flex items-center mr-2">
            Exemplos:
          </span>
          {examples.map((ex) => (
            <button
              key={ex.sn}
              onClick={() => {
                setSn(ex.sn);
                fetchDiagnosis(ex.sn);
              }}
              className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 px-2 py-1 rounded border border-white/5 transition-colors font-mono"
            >
              {ex.sn} ({ex.label})
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
              Sinal RX ONU
            </p>
            <div
              className={`text-5xl font-bold mb-2 ${getSignalColor(result.signals.rxOnu, "rx")}`}
            >
              {result.signals.rxOnu.toFixed(2)}{" "}
              <span className="text-xl">dBm</span>
            </div>
            <p className="text-sm text-zinc-400">
              Potência recebida pelo equipamento do cliente
            </p>
            <div className="mt-6 w-full h-2 bg-black/50 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${getSignalColor(result.signals.rxOnu, "rx").replace("text-", "bg-")}`}
                style={{
                  width: `${Math.max(0, Math.min(100, (result.signals.rxOnu + 40) * 2.5))}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
              Sinal RX OLT
            </p>
            <div
              className={`text-5xl font-bold mb-2 ${getSignalColor(result.signals.rxOlt, "rx")}`}
            >
              {result.signals.rxOlt.toFixed(2)}{" "}
              <span className="text-xl">dBm</span>
            </div>
            <p className="text-sm text-zinc-400">
              Potência da ONU recebida na central
            </p>
            <div className="mt-6 w-full h-2 bg-black/50 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${getSignalColor(result.signals.rxOlt, "rx").replace("text-", "bg-")}`}
                style={{
                  width: `${Math.max(0, Math.min(100, (result.signals.rxOlt + 40) * 2.5))}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 col-span-full">
            <h3 className="text-lg font-semibold text-white mb-4">
              Detalhes Adicionais
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                  TX ONU (Real)
                </p>
                <p className="text-white font-mono">
                  {typeof result.signals.txOnu === "number"
                    ? `${result.signals.txOnu} dBm`
                    : result.signals.txOnu}
                </p>
              </div>
              <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                  TX OLT
                </p>
                <p className="text-white font-mono">
                  {typeof result.signals.txOlt === "number"
                    ? `${result.signals.txOlt} dBm`
                    : result.signals.txOlt}
                </p>
              </div>
              <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                  Distância
                </p>
                <p className="text-white font-mono">
                  {result.distance || "N/A"}
                </p>
              </div>
              <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                  Uptime
                </p>
                <p className="text-white font-mono text-xs truncate">
                  {result.uptime || "N/A"}
                </p>
              </div>
              <div className="p-4 bg-black/30 rounded-xl border border-white/5 col-span-2">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                  Nome / Descrição
                </p>
                <p className="text-white font-mono truncate">
                  {result.name || "N/A"}
                </p>
              </div>
              <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                  Status ONU
                </p>
                <p
                  className={`font-bold ${result.status.toLowerCase() === "working" ? "text-emerald-500" : "text-red-500"}`}
                >
                  {result.status}
                </p>
              </div>
              <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                  Localização
                </p>
                <p className="text-white truncate">{result.olt}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatusManager = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form
  const [statusCode, setStatusCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("gray");

  const fetchStatuses = async () => {
    setLoading(true);
    try {
      const res = await api.get("/olts/status");
      setStatuses(res.data);
    } catch (err: any) {
      toast.error("Erro ao carregar status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/olts/status/${editingId}`, {
          status_code: statusCode,
          description,
          color,
        });
        toast.success("Status atualizado");
      } else {
        await api.post("/olts/status", {
          status_code: statusCode,
          description,
          color,
        });
        toast.success("Status adicionado");
      }
      resetForm();
      fetchStatuses();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar status");
    }
  };

  const handleEdit = (status: any) => {
    setEditingId(status.id);
    setStatusCode(status.status_code);
    setDescription(status.description);
    setColor(status.color);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover este status?")) return;
    try {
      await api.delete(`/olts/status/${id}`);
      toast.success("Status removido");
      fetchStatuses();
    } catch (err: any) {
      toast.error("Erro ao remover");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setStatusCode("");
    setDescription("");
    setColor("gray");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#141414] border border-white/10 rounded-2xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">
          Gerenciar Descrições de Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingId ? "Editar Status" : "Novo Status"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Código de Status (Raw)
                </label>
                <input
                  type="text"
                  value={statusCode}
                  onChange={(e) => setStatusCode(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: working, los, dying-gasp"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Descrição Amigável
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Operacional, Sem Sinal"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Cor
                </label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="gray">Cinza (Padrão)</option>
                  <option value="green">Verde (Sucesso/Online)</option>
                  <option value="red">Vermelho (Erro/Offline)</option>
                  <option value="yellow">Amarelo (Atenção)</option>
                  <option value="blue">Azul (Info)</option>
                </select>
              </div>

              <div className="flex gap-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all"
                >
                  {editingId ? "Atualizar" : "Adicionar"}
                </button>
              </div>
            </form>
          </div>

          <div className="border-l border-white/10 pl-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              Status Cadastrados
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {loading ? (
                <Loader2 className="animate-spin mx-auto text-zinc-500" />
              ) : statuses.length === 0 ? (
                <p className="text-zinc-500 italic">Nenhum status definido.</p>
              ) : (
                statuses.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white/5 border border-white/5 p-3 rounded-lg flex justify-between items-center group hover:border-white/20 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full bg-${s.color === "green" ? "emerald" : s.color}-500`}
                        />
                        <span className="font-bold text-white text-sm">
                          {s.description}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 font-mono">
                        {s.status_code}
                      </span>
                    </div>
                    <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(s)}
                        className="p-1.5 hover:bg-white/10 rounded text-zinc-300"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 hover:bg-red-500/20 rounded text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const UniversalConfigModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await api.get("/olts/config");
      setUsername(res.data.universal_username || "");
      setPassword(res.data.universal_password || "");
    } catch (err) {
      toast.error("Erro ao carregar configurações");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/olts/config", {
        universal_username: username,
        universal_password: password,
      });
      toast.success("Credenciais universais atualizadas");
      onClose();
    } catch (err: any) {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">
          Credenciais Universais
        </h2>
        <p className="text-zinc-400 text-sm mb-4">
          Estas credenciais serão usadas para OLTs que não possuírem
          usuário/senha específicos definidos.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Usuário Padrão
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              placeholder="Ex: netflex"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Senha Padrão
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                placeholder="••••••••"
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

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex justify-center"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Salvar Configuração"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const OLTManager = () => {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const [olts, setOlts] = useState<any[]>([]);
  const [searchIp, setSearchIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [type, setType] = useState("ZTE");
  const [actions, setActions] = useState(["view"]); // Default action

  const fetchOlts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/olts/");
      setOlts(res.data);
    } catch (err: any) {
      toast.error("Erro ao carregar OLTs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOlts();
  }, []);

  const resetForm = () => {
    setName("");
    setIp("");
    setUsername("");
    setPassword("");
    setType("ZTE");
    setActions(["view"]);
    setIsEditing(false);
    setCurrentId(null);
  };

  const openModal = (olt?: any) => {
    if (olt) {
      setIsEditing(true);
      setCurrentId(olt.id);
      setName(olt.name);
      setIp(olt.ip);
      setUsername(olt.username || "");
      setPassword(""); // Don't fill password for security
      setType(olt.type || "ZTE");
      setActions(olt.actions || ["view"]);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      ip,
      username: username || null, // Convert empty string to null
      password: password || undefined, // Send undefined if empty during edit to not change it
      type,
      actions,
    };

    // If creating, password can be null (universal)
    if (!isEditing && password === "") delete payload.password;
    // If editing and password is "", it means "no change" OR "remove password" depending on logic.
    // My backend logic: if password in data is "", set passed=None. If omitted, no change.
    // Let's refine:
    // If user wants to clear password (use universal), they might need a specific checkbox?
    // For now, let's assume empty password in edit means NO CHANGE.
    // New password input means change.
    // Backend logic I wrote: if 'password' in data: if data['password'] == "": elt.password = None else ...
    // So sending empty string WILL clear password.
    // If I want "no change", I should NOT send 'password' key.

    if (isEditing && password === "") {
      // To not change password, do not include it in payload
      // But Typescript might complain.
      // We'll cast to any.
      delete (payload as any).password;
    }

    try {
      if (isEditing && currentId) {
        await api.put(`/olts/${currentId}`, payload);
        toast.success("OLT atualizada com sucesso");
      } else {
        await api.post("/olts/", payload);
        toast.success("OLT adicionada com sucesso");
      }
      setIsModalOpen(false);
      fetchOlts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar OLT");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover esta OLT?")) return;
    try {
      await api.delete(`/olts/${id}`);
      toast.success("OLT removida");
      fetchOlts();
    } catch (err: any) {
      toast.error("Erro ao remover OLT");
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Gerenciamento de OLTs
          </h1>
          <p className="text-zinc-400">Configure as OLTs e suas credenciais.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Key className="w-5 h-5" />
            Credenciais Universais
          </button>
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Gerenciar Status
          </button>
          <button
            onClick={() => openModal()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Adicionar OLT
          </button>
        </div>
      </header>

      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filtrar por IP..."
            value={searchIp}
            onChange={(e) => setSearchIp(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#141414] z-10 shadow-sm">
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  Nome
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  IP
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  Tipo
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  Credencial
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Carregando...
                  </td>
                </tr>
              ) : olts.filter((olt) => olt.ip.includes(searchIp)).length ===
                0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    Nenhuma OLT encontrada.
                  </td>
                </tr>
              ) : (
                olts
                  .filter((olt) => olt.ip.includes(searchIp))
                  .map((olt) => (
                    <tr
                      key={olt.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 text-white font-medium">
                        {olt.name}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-mono text-sm">
                        {olt.ip}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase">
                          {olt.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {olt.username ? (
                          <span className="text-emerald-400">
                            Personalizada ({olt.username})
                          </span>
                        ) : (
                          <span className="text-yellow-500">Universal</span>
                        )}
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => openModal(olt)}
                          className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Settings size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(olt.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#141414] border border-white/10 rounded-2xl max-w-lg w-full p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">
              {isEditing ? "Editar OLT" : "Nova OLT"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Nome / Identificação
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: OLT Principal"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Endereço IP
                  </label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="192.168.1.1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Tipo / Fabricante
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ZTE">ZTE</option>
                    <option value="Huawei">Huawei</option>
                    <option value="Nokia">Nokia</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <h3 className="text-sm font-bold text-white mb-4">
                  Autenticação
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Usuário (Opcional)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Deixe vazio para usar padrão universal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Senha (Opcional)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                        placeholder={
                          isEditing
                            ? "Deixe vazio para manter atual"
                            : "Deixe vazio para usar padrão universal"
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      <StatusManager
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
      <UniversalConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
};

const Profile = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Meu Perfil
        </h1>
        <p className="text-zinc-400">Gerencie suas informações e segurança.</p>
      </header>

      <div className="max-w-2xl bg-[#141414] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 text-3xl font-bold">
            {localStorage.getItem("username")?.[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {localStorage.getItem("username")}
            </h2>
            <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold mt-1">
              {localStorage.getItem("role")}
            </p>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Key size={20} className="text-emerald-500" />
            Alterar Senha
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Senha Atual
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Atualizar Senha"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");

  // Create user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("tech");

  // Edit user state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Search filter
  const [userSearch, setUserSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logDate, setLogDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, logsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/logs"),
      ]);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      toast.error("Erro ao carregar dados administrativos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/users", {
        username: newUsername,
        password: newPassword,
        role: newRole,
      });
      toast.success("Usuário criado com sucesso");
      setNewUsername("");
      setNewPassword("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao criar usuário");
    }
  };

  const handleDeleteUser = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening edit modal
    if (!confirm("Deseja realmente excluir este usuário?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("Usuário excluído");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao excluir");
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword(""); // Reset password field
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const payload: any = {};
      if (editUsername !== editingUser.username)
        payload.username = editUsername;
      if (editPassword) payload.password = editPassword;

      if (Object.keys(payload).length === 0) {
        setEditingUser(null);
        return;
      }

      await api.put(`/admin/users/${editingUser.id}`, payload);
      toast.success("Usuário atualizado com sucesso");
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao atualizar usuário");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const filteredLogs = logs.filter((log) => {
    // Filter out login/logout events if requested
    const isLoginEvent =
      log.action === "User logged in" || log.action === "User logged out";
    if (isLoginEvent) return false;

    const term = logSearch.toLowerCase();

    // Filter by date if set
    if (logDate) {
      const logDateString = new Date(log.timestamp).toISOString().split("T")[0];
      if (logDateString !== logDate) return false;
    }

    return (
      log.username.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-zinc-400">
            Gerenciamento de usuários e auditoria de logs.
          </p>
        </div>
        <div className="flex bg-[#141414] border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "users" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-white"}`}
          >
            Usuários
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "logs" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-white"}`}
          >
            Logs
          </button>
        </div>
      </header>

      {activeTab === "users" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users size={20} className="text-emerald-500" />
                Usuários Cadastrados
              </h3>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={16}
                />
                <input
                  type="text"
                  className="bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-64"
                  placeholder="Filtrar por nome..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#141414] z-10 shadow-sm">
                  <tr className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-white/5">
                    <th className="px-6 py-4 bg-[#141414]">ID</th>
                    <th className="px-6 py-4 bg-[#141414]">Usuário</th>
                    <th className="px-6 py-4 bg-[#141414]">Nível</th>
                    <th className="px-6 py-4 bg-[#141414] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openEditModal(u)}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                        {u.id}
                      </td>
                      <td className="px-6 py-4 text-white font-medium group-hover:text-emerald-400 transition-colors">
                        {u.username}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === "admin" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}
                        >
                          {u.role === "admin" ? "Administrador" : "Técnico"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => handleDeleteUser(u.id, e)}
                          className="text-zinc-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-50 group-hover:opacity-100"
                          title="Excluir Usuário"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-zinc-500 italic">
                  Nenhum usuário encontrado.
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 h-fit">
            <h3 className="text-lg font-semibold text-white mb-6">
              Novo Usuário
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
              <div>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Nível de Acesso
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="tech">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Criar Usuário
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History size={20} className="text-emerald-500" />
              Logs do Sistema
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <input
                type="date"
                className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={16}
                />
                <input
                  type="text"
                  className="bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-full sm:w-64"
                  placeholder="Filtrar logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#141414] z-10 shadow-lg">
                <tr className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-white/5">
                  <th className="px-6 py-4 bg-[#141414]">Data/Hora</th>
                  <th className="px-6 py-4 bg-[#141414]">Usuário</th>
                  <th className="px-6 py-4 bg-[#141414]">Ação</th>
                  <th className="px-6 py-4 bg-[#141414]">IP</th>
                  <th className="px-6 py-4 bg-[#141414]">Sistema</th>
                  <th className="px-6 py-4 bg-[#141414]">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {log.username}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs font-mono">
                      {log.ip || "-"}
                    </td>
                    <td
                      className="px-6 py-4 text-zinc-400 text-[10px] max-w-[150px] truncate"
                      title={log.system}
                    >
                      {log.system || "-"}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-sm">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setEditingUser(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                <User size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Editar Usuário</h3>
                <p className="text-zinc-500 text-sm">
                  Atualize os dados de acesso.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Nova Senha (opcional)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Deixe em branco para manter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showEditPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Background state for Locate and Diagnosis pages
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
      const storedUser = localStorage.getItem("user");

      if (token && storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (!parsedUser.role) {
            parsedUser.role = "tech";
          }
          setUser(parsedUser);

          await api.get("/auth/check");
        } catch (e) {
          console.error("Auth check failed:", e);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          localStorage.removeItem("role");
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (data: { token: string; user: UserData }) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("username", data.user.username);
    localStorage.setItem("role", data.user.role);
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    setUser(null);
  };

  if (loading) return null;

  return (
    <BrowserRouter>
      <ToastContainer
        theme="dark"
        position="bottom-right"
        aria-label="Notificações"
      />
      <Routes>
        {!user ? (
          <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
        ) : (
          <Route
            path="*"
            element={
              <div className="flex min-h-screen bg-[#0a0a0a]">
                <Sidebar user={user} onLogout={handleLogout} />
                <main className="flex-1 p-4 lg:p-8 pt-20 lg:pt-8 overflow-y-auto">
                  <div className="max-w-7xl mx-auto">
                    <Routes>
                      <Route path="/home" element={<Dashboard />} />
                      <Route
                        path="/locate"
                        element={
                          <LocateOnu
                            state={locateState}
                            setState={setLocateState}
                          />
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
                      {user.role === "admin" && (
                        <Route path="/olts" element={<OLTManager />} />
                      )}
                      <Route path="/profile" element={<Profile />} />
                      {user.role === "admin" && (
                        <Route path="/admin" element={<AdminPanel />} />
                      )}
                      <Route
                        path="*"
                        element={<Navigate to="/home" replace />}
                      />
                    </Routes>
                  </div>
                </main>
              </div>
            }
          />
        )}
      </Routes>
    </BrowserRouter>
  );
}
