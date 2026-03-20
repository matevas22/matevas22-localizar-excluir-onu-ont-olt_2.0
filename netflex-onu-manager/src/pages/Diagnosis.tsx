import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Activity, Loader2, X, Activity as Pulse, History } from "lucide-react";
import { toast } from "react-toastify";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import axios from "axios";
import api from "../services/api";
import { PageProps } from "../types";
import { getRecentSns, addRecentSn } from "../utils/recentSns";
import "../styles/Diagnosis.css";

const Diagnosis = ({ state, setState }: PageProps) => {
  const { sn, loading, result: rawResult } = state;
  const result = rawResult && !Array.isArray(rawResult) ? rawResult : null;

  const location = useLocation();
  const [recentSns, setRecentSns] = useState<string[]>(() => getRecentSns());
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [checkupLoading, setCheckupLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const snParam = params.get("sn");
    if (snParam && snParam !== sn && !loading && !rawResult) {
      setState((prev) => ({ ...prev, sn: snParam }));
      fetchDiagnosis(snParam);
    }
  }, [location, sn]);

  const setSn = (value: string) => {
    setState((prev) => ({ ...prev, sn: value }));
  };

  const fetchDiagnosis = async (searchSn: string) => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, loading: true, result: null, controller }));

    try {
      const res = await api.get(`/onu/signal/` + searchSn, {
        signal: controller.signal,
      });
      addRecentSn(searchSn);
      setRecentSns(getRecentSns());
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

  const fetchHistory = async (searchSn: string) => {
    try {
      const res = await api.get(`/onu/signal-history/` + searchSn);
      const formatted = res.data.map((h: any) => ({
        ...h,
        time: new Date(h.timestamp).toLocaleTimeString(),
        date: new Date(h.timestamp).toLocaleDateString(),
      }));
      setHistoryData(formatted);
      setShowHistoryModal(true);
    } catch (err: any) {
      toast.error("Erro ao obter histórico");
    }
  };

  const handleCheckup = async () => {
    if (!sn || sn.length !== 12 || !result?.olt_ip) {
      toast.error("Dados da OLT não encontrados para realizar check-up.");
      return;
    }
    setCheckupLoading(true);
    try {
      const res = await api.post("/onu/checkup", { sn, olt_ip: result.olt_ip });
      toast.success("Check-up concluído!");
      setState((prev) => ({
        ...prev,
        result: { ...prev.result, ...res.data },
      }));
      fetchHistory(sn);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro no Check-up");
    } finally {
      setCheckupLoading(false);
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
    const clean = state.sn.trim();
    if (clean.length !== 12) {
      toast.warn("O SN deve ter exatamente 12 caracteres.");
      return;
    }
    fetchDiagnosis(clean);
  };

  const getSignalColor = (val, type) => {
    if (type === "rx") {
      if (val < -28 || val > -8) return "text-red-500";
      if (val < -25) return "text-yellow-500";
      return "text-emerald-500";
    }
    return "text-emerald-500";
  };

  return (
    <div className="diagnosis-container">
      <header className="diagnosis-header">
        <h1>Diagnóstico de Sinal</h1>
        <p>Verifique os níveis de sinal óptico em tempo real.</p>
      </header>

      <div className="search-card">
        <form onSubmit={handleSearch} className="diagnosis-search-form">
          <div className="input-container">
            <Activity className="input-icon" size={20} />
            <input
              type="text"
              value={sn}
              onChange={(e) => setSn(e.target.value.toUpperCase())}
              maxLength={12}
              placeholder="Digite o Número de Série para diagnóstico"
              className="search-input"
            />
          </div>
          <div className="button-group">
            <button
              type="submit"
              disabled={loading}
              className="diagnosis-submit-btn"
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
                className="cancel-btn"
                title="Cancelar verificação"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </form>

        {recentSns.length > 0 && (
          <div className="recent-container">
            <span className="recent-label">Recentes:</span>
            {recentSns.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSn(s);
                  fetchDiagnosis(s);
                }}
                className="recent-btn"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {result && !Array.isArray(result) && result.signals && (
        <div className="results-grid">
          <div className="signal-card">
            <p className="detail-label">Sinal RX ONU</p>
            <div
              className={`signal-value ${getSignalColor(result.signals.rxOnu, "rx")}`}
            >
              {typeof result.signals.rxOnu === "number"
                ? result.signals.rxOnu.toFixed(2)
                : result.signals.rxOnu}{" "}
              <span className="signal-unit">dBm</span>
            </div>
            <p className="signal-desc">
              Potência recebida pelo equipamento do cliente
            </p>
            {typeof result.signals.rxOnu === "number" && (
              <div className="signal-bar-bg">
                <div
                  className={`signal-bar-fill ${getSignalColor(result.signals.rxOnu, "rx").replace("text-", "bg-")}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (result.signals.rxOnu + 40) * 2.5))}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="signal-card">
            <p className="detail-label">Sinal RX OLT</p>
            <div
              className={`signal-value ${getSignalColor(result.signals.rxOlt, "rx")}`}
            >
              {typeof result.signals.rxOlt === "number"
                ? result.signals.rxOlt.toFixed(2)
                : result.signals.rxOlt}{" "}
              <span className="signal-unit">dBm</span>
            </div>
            <p className="signal-desc">Potência da ONU recebida na central</p>
            {typeof result.signals.rxOlt === "number" && (
              <div className="signal-bar-bg">
                <div
                  className={`signal-bar-fill ${getSignalColor(result.signals.rxOlt, "rx").replace("text-", "bg-")}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (result.signals.rxOlt + 40) * 2.5))}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="details-card">
            <h3 className="details-title">Detalhes Adicionais</h3>
            <div className="info-grid">
              <div className="info-item">
                <p className="info-label">TX ONU (Real)</p>
                <p className="info-value">
                  {typeof result.signals.txOnu === "number"
                    ? result.signals.txOnu + " dBm"
                    : result.signals.txOnu}
                </p>
              </div>
              <div className="info-item">
                <p className="info-label">TX OLT</p>
                <p className="info-value">
                  {typeof result.signals.txOlt === "number"
                    ? result.signals.txOlt + " dBm"
                    : result.signals.txOlt}
                </p>
              </div>
              <div className="info-item">
                <p className="info-label">Distância</p>
                <p className="info-value">{result.distance || "N/A"}</p>
              </div>
              <div className="info-item">
                <p className="info-label">Uptime</p>
                <p className="info-value truncate">{result.uptime || "N/A"}</p>
              </div>
              <div className="info-item col-span-2">
                <p className="info-label">Nome / Descrição</p>
                <p className="info-value truncate">{result.name || "N/A"}</p>
              </div>
              <div className="info-item">
                <p className="info-label">Status ONU</p>
                <p
                  className={`font-bold ${result.status?.toLowerCase() === "working" ? "text-emerald-500" : "text-red-500"}`}
                >
                  {result.status}
                </p>
              </div>
              <div className="info-item">
                <p className="info-label">Localização</p>
                <p className="info-value truncate">{result.olt}</p>
              </div>
            </div>

            <div className="diagnosis-actions">
              <button
                onClick={handleCheckup}
                disabled={checkupLoading}
                className="checkup-btn"
              >
                {checkupLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Pulse size={18} />
                )}
                Check-up Avançado
              </button>
              <button onClick={() => fetchHistory(sn)} className="history-btn">
                <History size={18} />
                Ver Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div
          className="history-modal-overlay"
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="history-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                padding: "1.5rem",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 style={{ margin: 0, color: "#fff" }}>
                Histórico de Sinais: {sn}
              </h2>
              <button
                className="close-modal"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#71717a",
                  cursor: "pointer",
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div
              className="modal-body"
              style={{
                padding: "1.5rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "2rem",
              }}
            >
              <div
                className="chart-container-modal"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                }}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                    <YAxis
                      stroke="#9ca3af"
                      domain={["dataMin - 2", "dataMax + 2"]}
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "none",
                        color: "#fff",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="rx_power"
                      name="RX ONU"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="tx_power"
                      name="TX ONU"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div
                className="history-table-wrapper"
                style={{
                  maxHeight: "200px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  paddingRight: "5px",
                }}
              >
                <table
                  className="history-table"
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: "0",
                    color: "#d1d5db",
                  }}
                >
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      backgroundColor: "#18181b",
                    }}
                  >
                    <tr>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          background: "rgba(255,255,255,0.05)",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        Data
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          background: "rgba(255,255,255,0.05)",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        Hora
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          background: "rgba(255,255,255,0.05)",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        RX Power
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          background: "rgba(255,255,255,0.05)",
                          borderBottom: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        TX Power
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...historyData].reverse().map((item, idx) => (
                      <tr key={idx}>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          {item.date}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          {item.time}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                          }}
                          className={getSignalColor(item.rx_power, "rx")}
                        >
                          {item.rx_power.toFixed(2)} dBm
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid rgba(255,255,255,0.05)",
                            color: "#3b82f6",
                          }}
                        >
                          {item.tx_power.toFixed(2)} dBm
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diagnosis;
