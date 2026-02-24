import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Activity, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import api from "../services/api";
import { PageProps } from "../types";

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
        <form
          onSubmit={handleSearch}
          className="flex flex-col lg:flex-row gap-4 mb-4"
        >
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
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white px-8 rounded-xl font-bold transition-all flex items-center justify-center gap-2 flex-1 lg:flex-none"
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

        {recentSns.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-zinc-500 uppercase font-bold mr-2">
              Recentes:
            </span>
            {recentSns.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSn(s);
                  fetchDiagnosis(s);
                }}
                className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 px-2 py-1 rounded border border-white/5 transition-colors font-mono"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {result && result.signals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
              Sinal RX ONU
            </p>
            <div
              className={`text-5xl font-bold mb-2 ${getSignalColor(result.signals.rxOnu, "rx")}`}
            >
              {typeof result.signals.rxOnu === "number"
                ? result.signals.rxOnu.toFixed(2)
                : result.signals.rxOnu}{" "}
              <span className="text-xl">dBm</span>
            </div>
            <p className="text-sm text-zinc-400">
              Potência recebida pelo equipamento do cliente
            </p>
            {typeof result.signals.rxOnu === "number" && (
              <div className="mt-6 w-full h-2 bg-black/50 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${getSignalColor(result.signals.rxOnu, "rx").replace("text-", "bg-")}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (result.signals.rxOnu + 40) * 2.5))}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="bg-[#141414] border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
              Sinal RX OLT
            </p>
            <div
              className={`text-5xl font-bold mb-2 ${getSignalColor(result.signals.rxOlt, "rx")}`}
            >
              {typeof result.signals.rxOlt === "number"
                ? result.signals.rxOlt.toFixed(2)
                : result.signals.rxOlt}{" "}
              <span className="text-xl">dBm</span>
            </div>
            <p className="text-sm text-zinc-400">
              Potência da ONU recebida na central
            </p>
            {typeof result.signals.rxOlt === "number" && (
              <div className="mt-6 w-full h-2 bg-black/50 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${getSignalColor(result.signals.rxOlt, "rx").replace("text-", "bg-")}`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (result.signals.rxOlt + 40) * 2.5))}%`,
                  }}
                />
              </div>
            )}
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
                  className={`font-bold ${result.status?.toLowerCase() === "working" ? "text-emerald-500" : "text-red-500"}`}
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

export default Diagnosis;
