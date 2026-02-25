// src/components/StatusManager.tsx
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Loader2, X, Settings, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "../styles/StatusManager.css";

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
    <div className="status-manager-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="status-manager-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="status-manager-close-btn">
          <X size={20} />
        </button>

        <h2 className="status-manager-title">Gerenciar Descrições de Status</h2>

        <div className="status-manager-grid">
          <div>
            <h3 className="status-manager-section-title">
              {editingId ? "Editar Status" : "Novo Status"}
            </h3>
            <form onSubmit={handleSubmit} className="status-manager-form">
              <div>
                <label className="status-manager-label">
                  Código de Status (Raw)
                </label>
                <input
                  type="text"
                  value={statusCode}
                  onChange={(e) => setStatusCode(e.target.value)}
                  className="status-manager-input"
                  placeholder="Ex: working, los, dying-gasp"
                  required
                />
              </div>
              <div>
                <label className="status-manager-label">
                  Descrição Amigável
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="status-manager-input"
                  placeholder="Ex: Operacional, Sem Sinal"
                  required
                />
              </div>
              <div>
                <label className="status-manager-label">Cor</label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="status-manager-select"
                >
                  <option value="gray">Cinza (Padrão)</option>
                  <option value="green">Verde (Sucesso/Online)</option>
                  <option value="red">Vermelho (Erro/Offline)</option>
                  <option value="yellow">Amarelo (Atenção)</option>
                  <option value="blue">Azul (Info)</option>
                </select>
              </div>

              <div className="status-manager-btn-group">
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="status-manager-btn-cancel"
                  >
                    Cancelar
                  </button>
                )}
                <button type="submit" className="status-manager-btn-submit">
                  {editingId ? "Atualizar" : "Adicionar"}
                </button>
              </div>
            </form>
          </div>

          <div className="status-manager-list-container">
            <h3 className="status-manager-section-title">Status Cadastrados</h3>
            <div className="status-manager-list">
              {loading ? (
                <Loader2 className="status-manager-loader" />
              ) : statuses.length === 0 ? (
                <p className="status-manager-empty">Nenhum status definido.</p>
              ) : (
                statuses.map((s) => (
                  <div key={s.id} className="status-item group">
                    <div className="status-item-info">
                      <div className="status-item-header">
                        <span
                          className={`status-item-dot status-dot-${s.color === "green" ? "emerald" : s.color}`}
                        />
                        <span className="status-item-description">
                          {s.description}
                        </span>
                      </div>
                      <span className="status-item-code">{s.status_code}</span>
                    </div>
                    <div className="status-item-actions">
                      <button
                        onClick={() => handleEdit(s)}
                        className="status-action-btn status-action-btn-edit"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="status-action-btn status-action-btn-delete"
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
