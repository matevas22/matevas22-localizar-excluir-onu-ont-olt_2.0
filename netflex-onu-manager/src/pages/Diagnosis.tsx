import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Activity, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import api from "../services/api";
import { PageProps } from "../types";
import "../styles/Diagnosis.css";

const Diagnosis = ({ state, setState }: PageProps) => {
  const { sn, loading, result } = state;
  const location = useLocation();
  const [recentSns, setRecentSns] = useState<string[]>([]);

  useEffect(() => {
    api
      .get("/user/recent-sns")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setRecentSns(res.data);
        }
      })
      .catch((err) => console.error("Erro ao carregar SNs recentes", err));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const snParam = params.get("sn");
    if (snParam && snParam !== sn && !loading && !result) {
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

      {result && result.signals && (
        <div className="results-grid">
          <div className="signal-card">
            <p className="detail-label">Sinal RX ONU</p>
            <div
              className={`signal-value ${getSignalColor(
                result.signals.rxOnu,
                "rx",
              )}`}
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
                  className={`signal-bar-fill ${getSignalColor(
                    result.signals.rxOnu,
                    "rx",
                  ).replace("text-", "bg-")}`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (result.signals.rxOnu + 40) * 2.5),
                    )}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="signal-card">
            <p className="detail-label">Sinal RX OLT</p>
            <div
              className={`signal-value ${getSignalColor(
                result.signals.rxOlt,
                "rx",
              )}`}
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
                  className={`signal-bar-fill ${getSignalColor(
                    result.signals.rxOlt,
                    "rx",
                  ).replace("text-", "bg-")}`}
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (result.signals.rxOlt + 40) * 2.5),
                    )}%`,
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
                    ? `${result.signals.txOnu} dBm`
                    : result.signals.txOnu}
                </p>
              </div>
              <div className="info-item">
                <p className="info-label">TX OLT</p>
                <p className="info-value">
                  {typeof result.signals.txOlt === "number"
                    ? `${result.signals.txOlt} dBm`
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
                  className={`font-bold ${
                    result.status?.toLowerCase() === "working"
                      ? "text-emerald-500"
                      : "text-red-500"
                  }`}
                >
                  {result.status}
                </p>
              </div>
              <div className="info-item">
                <p className="info-label">Localização</p>
                <p className="info-value truncate">{result.olt}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diagnosis;
