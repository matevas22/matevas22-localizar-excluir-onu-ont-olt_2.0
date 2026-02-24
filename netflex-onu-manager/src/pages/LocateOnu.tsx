import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Search,
  Loader2,
  X,
  Activity,
} from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import api from "../services/api";

const LocateOnu = () => {
  const [sn, setSnState] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [controller, setController] = useState<AbortController | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSn = sn.trim();
    if (cleanSn.length !== 12) {
      toast.warn("O SN deve ter exatamente 12 caracteres.");
      return;
    }

    const newController = new AbortController();
    setController(newController);
    setLoading(true);
    setResult(null);

    try {
      const res = await api.post(
        "/onu/locate",
        { sn: cleanSn },
        { signal: newController.signal },
      );
      setResult(res.data);
      setLoading(false);
    } catch (err: any) {
      if (axios.isCancel(err)) {
        // Request cancelled
      } else {
        toast.error(err.response?.data?.error || "Erro ao localizar ONU");
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    if (controller) {
      controller.abort();
      setLoading(false);
      setController(null);
    }
  };

  const setSn = (value: string) => {
    setSnState(value.toUpperCase());
  };

  const handleDelete = async () => {
    if (!result) return;
    try {
      await api.delete(`/onu/${result.sn}`);
      toast.success("ONU excluída com sucesso!");
      setResult(null);
      setShowDeleteModal(false);
    } catch (err: any) {
      toast.error("Erro ao excluir ONU");
    }
  };

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
          <div className="flex gap-2 w-full lg:w-auto">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white py-3 px-8 rounded-xl font-bold transition-all flex items-center justify-center gap-2 flex-1 lg:flex-none"
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

        {recentSns.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] text-zinc-500 uppercase font-bold mr-2">
              Recentes:
            </span>
            {recentSns.map((s) => (
              <button
                key={s}
                onClick={() => setSn(s)}
                className="text-[10px] bg-white/5 hover:bg-white/10 text-zinc-400 px-2 py-1 rounded border border-white/5 transition-colors font-mono"
              >
                {s}
              </button>
            ))}
          </div>
        )}
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

export default LocateOnu;
