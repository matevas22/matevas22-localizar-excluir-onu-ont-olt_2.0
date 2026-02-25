import "../styles/Dashboard.css";
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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Painel de Controle</h1>
        <p className="dashboard-subtitle">
          Visão geral das suas atividades recentes.
        </p>
      </header>

      {/* Top Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-icon emerald">
              <Activity size={24} />
            </div>
            <div>
              <p className="stat-label">Total de Ações</p>
              <h4 className="stat-value">{totalActions}</h4>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-icon blue">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="stat-label">Mais Frequente</p>
              <h4 className="stat-value truncate" title={mostFrequent}>
                {mostFrequent}
              </h4>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-icon purple">
              <Shield size={24} />
            </div>
            <div>
              <p className="stat-label">Status do Sistema</p>
              <div className="status-indicator">
                <span className="status-dot"></span>
                <h4 className="status-text">Online</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-icon orange">
              <Settings size={24} />
            </div>
            <div>
              <p className="stat-label">Versão</p>
              <h4 className="stat-value">v1.0.2</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="main-grid">
        {/* Left Column - Charts */}
        <div className="charts-column">
          <div className="charts-card">
            <h3 className="card-title">
              <History size={20} className="icon-emerald" />
              Resumo de Volume
            </h3>
            <div className="chart-container">
              {loading ? (
                <div className="loading-container">
                  <Loader2 className="spinner" size={24} />
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
                <div className="empty-state">
                  Nenhuma atividade registrada ainda.
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="activity-card">
            <div className="activity-header">
              <h3 className="card-title">
                <Activity size={20} className="icon-emerald" />
                Atividade Recente
              </h3>
              <Link to="/profile" className="view-all-link">
                Ver tudo
              </Link>
            </div>
            <div className="activity-list">
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div key={log.id} className="activity-item">
                    <div className="activity-icon">
                      <Activity size={16} />
                    </div>
                    <div className="activity-content">
                      <div className="activity-top">
                        <h4 className="activity-action">{log.action}</h4>
                        <span className="activity-time">
                          {new Date(log.timestamp).toLocaleDateString()}{" "}
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="activity-details">{log.details}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">Nenhuma atividade recente.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Pie Chart & Actions */}
        <div className="sidebar-column">
          <div className="charts-card">
            <h3 className="card-title">
              <TrendingUp size={20} className="icon-emerald" />
              Categorias
            </h3>
            <div className="chart-container">
              {loading ? (
                <div className="loading-container">
                  <Loader2 className="spinner" size={24} />
                </div>
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
                <div className="empty-state">
                  <Activity size={32} className="empty-icon" />
                  <span>Sem dados gráficos.</span>
                </div>
              )}
            </div>
          </div>

          <div className="quick-access-card">
            <h3 className="card-title">Acesso Rápido</h3>
            <div className="quick-access-grid">
              <Link to="/locate" className="quick-link emerald">
                <Search className="quick-icon" size={24} />
                <span className="quick-label">Localizar</span>
              </Link>
              <Link to="/diagnosis" className="quick-link blue">
                <Activity className="quick-icon" size={24} />
                <span className="quick-label">Diagnóstico</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
