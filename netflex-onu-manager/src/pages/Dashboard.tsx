import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  TrendingUp,
  Shield,
  Settings,
  History,
  Loader2,
  Search,
} from "lucide-react";
import {
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
  ResponsiveContainer,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import api from "../services/api";

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

export default Dashboard;
