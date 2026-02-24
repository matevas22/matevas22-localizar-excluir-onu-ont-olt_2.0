// src/components/StatusManager.tsx
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Loader2, X, Settings, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

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

export default StatusManager;
