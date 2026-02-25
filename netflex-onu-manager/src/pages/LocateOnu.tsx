import React, { useState, useEffect } from "react";
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
import { PageProps } from "../types";
import "../styles/LocateOnu.css";

const LocateOnu = ({ state, setState }: PageProps) => {
  const { sn, loading, result, controller } = state;
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

  const setSn = (value: string) => {
    setState((prev) => ({ ...prev, sn: value.toUpperCase() }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSn = sn.trim();
    if (cleanSn.length !== 12) {
      toast.warn("O SN deve ter exatamente 12 caracteres.");
      return;
    }

    const newController = new AbortController();
    setState((prev) => ({
      ...prev,
      loading: true,
      result: null,
      controller: newController,
    }));

    try {
      const res = await api.post(
        "/onu/locate",
        { sn: cleanSn },
        { signal: newController.signal },
      );
      setState((prev) => ({ ...prev, result: res.data, loading: false }));
    } catch (err: any) {
      if (axios.isCancel(err)) {
        // Request cancelled
      } else {
        toast.error(err.response?.data?.error || "Erro ao localizar ONU");
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
  };

  const handleCancel = () => {
    if (controller) {
      controller.abort();
      setState((prev) => ({ ...prev, loading: false, controller: null }));
    }
  };

  const handleDelete = async () => {
    if (!result) return;
    try {
      await api.delete(`/onu/${result.sn}`);
      toast.success("ONU excluída com sucesso!");
      setState((prev) => ({ ...prev, result: null }));
      setShowDeleteModal(false);
    } catch (err: any) {
      toast.error("Erro ao excluir ONU");
    }
  };

  return (
    <div className="locate-container">
      <header className="locate-header">
        <h1>Localizar ONU</h1>
        <p>Busque equipamentos na rede.</p>
      </header>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="input-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              value={sn}
              onChange={(e) => setSn(e.target.value)}
              maxLength={12}
              placeholder="Número de Série (12 caracteres)"
              className="search-input"
            />
          </div>
          <div className="button-wrapper">
            <button type="submit" disabled={loading} className="search-btn">
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
                className="cancel-btn"
                title="Cancelar busca"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </form>

        {recentSns.length > 0 && (
          <div className="recent-list">
            <span className="recent-label">Recentes:</span>
            {recentSns.map((s) => (
              <button key={s} onClick={() => setSn(s)} className="recent-item">
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
            className="result-card"
          >
            <div className="result-header">
              <div className="result-title">
                <h3>
                  <CheckCircle2 className="success-icon" size={20} />
                  Equipamento Localizado
                </h3>
                <p className="result-sn">{result.sn}</p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="delete-btn"
              >
                <Trash2 size={16} />
                Excluir ONU
              </button>
            </div>

            <div className="result-details">
              <div className="detail-item">
                <p className="detail-label">OLT</p>
                <p className="detail-value">{result.olt}</p>
                <p className="detail-mono">{result.ip}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Interface</p>
                <p className="detail-mono">{result.interface}</p>
              </div>
              <div className="detail-item">
                <p className="detail-label">Status</p>
                <div className="status-indicator">
                  <div
                    className={`status-dot ${
                      result.status === "Working"
                        ? "status-working"
                        : "status-error"
                    }`}
                  />
                  <p
                    className={`status-text ${
                      result.status === "Working"
                        ? "text-working"
                        : "text-error"
                    }`}
                  >
                    {result.status === "Working" ? "Operando" : result.status}
                  </p>
                </div>
              </div>
              <div className="detail-item">
                <p className="detail-label">Ação</p>
                <Link
                  to={`/diagnosis?sn=${result.sn}`}
                  className="diagnosis-link"
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
        <div className="modal-overlay">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content"
          >
            <div className="modal-icon-wrapper">
              <AlertTriangle size={32} />
            </div>
            <h3 className="modal-title">Confirmar Exclusão</h3>
            <p className="modal-desc">
              Você está prestes a excluir o equipamento{" "}
              <span className="modal-highlight">{result?.sn}</span> da interface{" "}
              <span className="modal-highlight">{result?.interface}</span>. Esta
              ação não pode ser desfeita.
            </p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="modal-cancel"
              >
                Cancelar
              </button>
              <button onClick={handleDelete} className="modal-confirm">
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
