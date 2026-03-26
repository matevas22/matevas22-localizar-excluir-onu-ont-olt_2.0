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
  Search,
  Filter,
} from "lucide-react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import api from "../services/api";
import "../styles/OLTManager.css";

const socket = io("http://localhost:5000", {
  transports: ["websocket"],
  autoConnect: true,
});

const GerenciaOLT = () => {
  const [olts, setOlts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOlt, setSelectedOlt] = useState<any | null>(null);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);

  const [portSearch, setPortSearch] = useState("");
  const [onuSearch, setOnuSearch] = useState("");

  const [monitorData, setMonitorData] = useState<any>(null);

  useEffect(() => {
    fetchOlts();

    socket.on("olt_update", (data) => {
      console.log("Recebido via WebSocket:", data);
      setMonitorData(data);
      toast.info("Status das OLTs atualizado em tempo real", {
        position: "bottom-right",
        autoClose: 2000,
      });
    });

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
    setPortSearch("");
    setOnuSearch("");
  };

  const handleSelectPort = (port: string) => {
    setSelectedPort(port);
    setOnuSearch("");
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

  const currentOltPorts = monitorData?.data?.[selectedOlt?.ip] || [];

  const filteredPorts = currentOltPorts.filter((p: any) =>
    p.port.toLowerCase().includes(portSearch.toLowerCase()),
  );

  const currentPortData = currentOltPorts.find(
    (p: any) => p.port === selectedPort,
  );
  const currentOnus = currentPortData?.onus || [];

  const filteredOnus = currentOnus.filter((onu: any) => {
    const searchLower = onuSearch.toLowerCase();
    const matchesSearch =
      onu.onu_id.toLowerCase().includes(searchLower) ||
      onu.omcc_state.toLowerCase().includes(searchLower) ||
      (onu.p_state || onu.phase_state || "")
        .toLowerCase()
        .includes(searchLower);

    return matchesSearch;
  });

  const stats = (filteredOnus.length > 0 ? filteredOnus : currentOnus).reduce(
    (acc: any, onu: any) => {
      const pmState = (onu.p_state || onu.phase_state || "").toLowerCase();
      const omState = (onu.omcc_state || "").toLowerCase();

      const isOnline =
        pmState.includes("working") || omState.includes("working");

      const isDying = pmState.includes("dying") || omState.includes("dying");

      const isOffline =
        !isOnline &&
        !isDying &&
        (pmState.includes("off") ||
          pmState.includes("los") ||
          omState.includes("off") ||
          omState.includes("los"));

      if (isOnline) acc.online++;
      else if (isDying) acc.dying++;
      else if (isOffline) acc.offline++;

      return acc;
    },
    { online: 0, offline: 0, dying: 0 },
  );

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
                    <div className="title-row">
                      <Layers size={18} /> Portas da OLT
                    </div>
                    <div className="sidebar-filter">
                      <Search size={14} className="filter-icon" />
                      <input
                        type="text"
                        placeholder="Filtrar porta..."
                        value={portSearch}
                        onChange={(e) => setPortSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  {currentOltPorts.length === 0 ? (
                    <div className="loading-inline">
                      <Clock className="animate-pulse" />
                      <p>Aguardando primeiro scan...</p>
                    </div>
                  ) : (
                    <div className="ports-column">
                      <div className="ports-list">
                        {filteredPorts.map((p: any) => (
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
                        <div className="onus-header-title">
                          <h2>Porta: {selectedPort}</h2>
                        </div>
                        <header className="olt-manager-header">
                          {currentOnus.length > 0 && (
                            <div className="onus-footer">
                              <div className="onus-footer-stats">
                                <span className="stat-item online">
                                  <b>{stats.online}</b> Online
                                </span>
                                <span className="stat-item offline">
                                  <b>{stats.offline}</b> Offline/LOS
                                </span>
                                <span className="stat-item dying">
                                  <b>{stats.dying}</b> DyingGasp
                                </span>
                                <span className="stat-item total">
                                  Total: <b>{currentOnus.length}</b>
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Real-time Indicator Badge */}
                        </header>
                        <div className="onus-header-filters">
                          <div className="search-box">
                            <Search size={16} />
                            <input
                              type="text"
                              placeholder="Filtrar ID, Status ou OMCC..."
                              value={onuSearch}
                              onChange={(e) => setOnuSearch(e.target.value)}
                            />
                          </div>
                        </div>
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
                            {filteredOnus.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="no-data">
                                  {currentOnus.length === 0
                                    ? "Nenhuma ONU encontrada nesta porta"
                                    : "Nenhum resultado para o filtro"}
                                </td>
                              </tr>
                            ) : (
                              filteredOnus.map((onu: any, i: number) => (
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
