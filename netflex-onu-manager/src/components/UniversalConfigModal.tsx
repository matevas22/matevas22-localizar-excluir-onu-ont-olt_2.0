// src/components/UniversalConfigModal.tsx
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Loader2, X, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import "../styles/UniversalConfigModal.css";

const UniversalConfigModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await api.get("/olts/config");
      setUsername(res.data.universal_username || "");
      setPassword(res.data.universal_password || "");
    } catch (err) {
      toast.error("Erro ao carregar configurações");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/olts/config", {
        universal_username: username,
        universal_password: password,
      });
      toast.success("Credenciais universais atualizadas");
      onClose();
    } catch (err: any) {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="universal-config-overlay" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="universal-config-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="universal-config-close-btn">
          <X size={20} />
        </button>

        <h2 className="universal-config-title">Credenciais Universais</h2>
        <p className="universal-config-description">
          Estas credenciais serão usadas para OLTs que não possuírem
          usuário/senha específicos definidos.
        </p>

        <form onSubmit={handleSave} className="universal-config-form">
          <div>
            <label className="universal-config-label">Usuário Padrão</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="universal-config-input"
              placeholder="Ex: netflex"
            />
          </div>
          <div>
            <label className="universal-config-label">Senha Padrão</label>
            <div className="universal-config-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="universal-config-input universal-config-input-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="universal-config-toggle-password"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="universal-config-btn-group">
            <button
              type="button"
              onClick={onClose}
              className="universal-config-btn-cancel"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="universal-config-btn-submit"
            >
              {loading ? (
                <Loader2 className="universal-config-loader" />
              ) : (
                "Salvar Configuração"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default UniversalConfigModal;
