import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Server,
  Cpu,
  Layers,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Activity,
  Info,
  Wifi,
  Clock,
} from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import api from "../services/api";
import "../styles/OLTManager.css";

// Configuração do SocketIO
const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  autoConnect: true,
});

const GerenciaOLT = () => {
  const [olts, setOlts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOlt, setSelectedOlt] = useState<any | null>(null);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);

  // Estados para Monitoramento
  const [monitorData, setMonitorData] = useState<any>(null);

  useEffect(() => {
    fetchOlts();

    // Ouvir atualizações em tempo real via WebSocket
    socket.on("olt_update", (data) => {
      console.log("Recebido via WebSocket:", data);
      setMonitorData(data);
      toast.info("Status das OLTs atualizado em tempo real", {
        position: "bottom-right",
        autoClose: 2000,
      });
    });

    // Buscar dados iniciais se existirem
    api
      .get("/olts/monitor-status")
      .then((res) => {
        setMonitorData(res.data);
      })
      .catch(() => {});

    return () => {
      socket.off("olt_update");
    };
  }, []);

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

  const handleSelectOlt = (olt: any) => {
    setSelectedOlt(olt);
    setSelectedPort(null);
  };

  const handleSelectPort = (port: string) => {
    setSelectedPort(port);
  };

  const getPhaseColor = (state: string) => {
    if (!state) return "#6b7280";
    switch (state.toLowerCase()) {
      case "working":
        return "#10b981";
      case "offline":
      case "los":
        return "#ef4444";
      case "syncmib":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  // Pega as portas da OLT selecionada do monitorData (pelo IP)
  const currentOltPorts = monitorData?.data?.[selectedOlt?.ip] || [];

  // Pega as ONUs da porta selecionada
  const currentPortData = currentOltPorts.find(
    (p: any) => p.port === selectedPort,
  );
  const currentOnus = currentPortData?.onus || [];

  if (loading) {
    return (
      <div className="olt-manager-loading">
        <Loader2 className="animate-spin" size={48} />
        <p>Carregando OLTs...</p>
      </div>
    );
  }

  return (
    <div className="olt-manager-container">
      <header className="olt-manager-header">
        <div className="header-content">
          <Server className="header-icon" />
          <div>
            <h1>Gerência OLT</h1>
            <p>Gerencie portas e ONUs em tempo real</p>
          </div>
        </div>

        {/* Real-time Indicator Badge */}
        {monitorData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="monitor-badge-realtime"
          >
            <div className="pulse-container">
              <div className="pulse-dot"></div>
              <Wifi size={14} className="wifi-icon" />
            </div>
            <div className="badge-text-content">
              <span className="badge-label">Live Monitor</span>
              <span className="badge-time">
                Refreshed: {monitorData.updated_at.split(" ")[1]}
              </span>
            </div>
          </motion.div>
        )}
      </header>

      <div className="olt-manager-content">
        <AnimatePresence mode="wait">
          {!selectedOlt ? (
            <motion.div
              key="olt-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="olt-grid"
            >
              {olts.map((olt) => (
                <button
                  key={olt.id}
                  className="olt-card"
                  onClick={() => handleSelectOlt(olt)}
                >
                  <div className="olt-card-icon">
                    <Cpu size={32} />
                  </div>
                  <div className="olt-card-info">
                    <h3>{olt.name}</h3>
                    <p>{olt.ip}</p>
                    <span className="olt-type-badge">{olt.type}</span>
                  </div>
                  <ChevronRight className="card-arrow" />
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="olt-details"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="olt-details-view"
            >
              <button
                className="back-button"
                onClick={() => setSelectedOlt(null)}
              >
                <ArrowLeft size={20} /> Voltar para OLTs
              </button>

              <div className="details-layout">
                <aside className="ports-sidebar">
                  <div className="sidebar-title">
                    <Layers size={18} /> Portas da OLT
                  </div>
                  {currentOltPorts.length === 0 ? (
                    <div className="loading-inline">
                      <Clock className="animate-pulse" />
                      <p>Aguardando primeiro scan...</p>
                    </div>
                  ) : (
                    <div className="ports-column">
                      <div className="ports-list">
                        {currentOltPorts.map((p: any) => (
                          <button
                            key={p.port}
                            className={`port-item ${selectedPort === p.port ? "active" : ""}`}
                            onClick={() => handleSelectPort(p.port)}
                          >
                            <div className="port-item-info">
                              <span className="port-name">{p.port}</span>
                              <span className="onu-count-badge">
                                {p.onus?.length || 0} ONUs
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </aside>

                <main className="onus-container">
                  {!selectedPort ? (
                    <div className="empty-state">
                      <Info size={48} />
                      <p>Selecione uma porta para listar as ONUs</p>
                    </div>
                  ) : (
                    <div className="onus-content">
                      <div className="onus-header">
                        <h2>Porta: {selectedPort}</h2>
                        {/* Status sync via monitorData */}
                      </div>

                      <div className="onus-table-wrapper">
                        <table className="onus-table">
                          <thead>
                            <tr>
                              <th>Índice</th>
                              <th>Admin State</th>
                              <th>OMCC State</th>
                              <th>Phase State</th>
                              <th>Channel</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentOnus.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="no-data">
                                  Nenhuma ONU encontrada nesta porta
                                </td>
                              </tr>
                            ) : (
                              currentOnus.map((onu: any, i: number) => (
                                <tr key={i}>
                                  <td>
                                    <strong>{onu.onu_id}</strong>
                                  </td>
                                  <td>
                                    <span
                                      className={`status-pill ${onu.admin_state === "enable" ? "success" : "danger"}`}
                                    >
                                      {onu.admin_state}
                                    </span>
                                  </td>
                                  <td>{onu.omcc_state}</td>
                                  <td>
                                    <div className="phase-cell">
                                      <span
                                        className="dot"
                                        style={{
                                          backgroundColor: getPhaseColor(
                                            onu.phase_state,
                                          ),
                                        }}
                                      ></span>
                                      {onu.p_state || onu.phase_state}
                                    </div>
                                  </td>
                                  <td>{onu.channel}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {currentOnus.length > 0 && (
                        <div className="onus-footer">
                          Total de ONUs: {currentOnus.length}
                        </div>
                      )}
                    </div>
                  )}
                </main>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GerenciaOLT;
