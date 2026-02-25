import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Key, Settings, Loader2, Trash2, X, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import StatusManager from "../components/StatusManager";
import UniversalConfigModal from "../components/UniversalConfigModal";
import "../styles/OLTManager.css";

const OLTManager = () => {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const [olts, setOlts] = useState<any[]>([]);
  const [searchIp, setSearchIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [type, setType] = useState("ZTE");
  const [actions, setActions] = useState(["view"]); // Default action

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

  useEffect(() => {
    fetchOlts();
  }, []);

  const resetForm = () => {
    setName("");
    setIp("");
    setUsername("");
    setPassword("");
    setType("ZTE");
    setActions(["view"]);
    setIsEditing(false);
    setCurrentId(null);
  };

  const openModal = (olt?: any) => {
    if (olt) {
      setIsEditing(true);
      setCurrentId(olt.id);
      setName(olt.name);
      setIp(olt.ip);
      setUsername(olt.username || "");
      setPassword(""); // Don't fill password for security
      setType(olt.type || "ZTE");
      setActions(olt.actions || ["view"]);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      ip,
      username: username || null, // Convert empty string to null
      password: password || undefined, // Send undefined if empty during edit to not change it
      type,
      actions,
    };

    // If creating, password can be null (universal)
    if (!isEditing && password === "") delete (payload as any).password;

    if (isEditing && password === "") {
      // To not change password, do not include it in payload
      delete (payload as any).password;
    }

    try {
      if (isEditing && currentId) {
        await api.put(`/olts/${currentId}`, payload);
        toast.success("OLT atualizada com sucesso");
      } else {
        await api.post("/olts/", payload);
        toast.success("OLT adicionada com sucesso");
      }
      setIsModalOpen(false);
      fetchOlts();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao salvar OLT");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover esta OLT?")) return;
    try {
      await api.delete(`/olts/${id}`);
      toast.success("OLT removida");
      fetchOlts();
    } catch (err: any) {
      toast.error("Erro ao remover OLT");
    }
  };

  return (
    <div className="olt-manager-container">
      <header className="olt-header">
        <div className="title-section">
          <h1>Gerenciamento de OLTs</h1>
          <p>Configure as OLTs e suas credenciais.</p>
        </div>
        <div className="header-actions">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="action-btn"
          >
            <Key size={20} />
            Credenciais Universais
          </button>
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className="action-btn"
          >
            <Settings size={20} />
            Gerenciar Status
          </button>
          <button onClick={() => openModal()} className="action-btn primary">
            <Settings size={20} />
            Adicionar OLT
          </button>
        </div>
      </header>

      <div className="table-card">
        <div className="filter-input-wrapper">
          <input
            type="text"
            placeholder="Filtrar por IP..."
            value={searchIp}
            onChange={(e) => setSearchIp(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="table-wrapper">
          <table className="olt-table">
            <thead className="table-head">
              <tr>
                <th>Nome</th>
                <th>IP</th>
                <th>Tipo</th>
                <th>Credencial</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {loading ? (
                <tr>
                  <td colSpan={5} className="loading-cell">
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Carregando...
                  </td>
                </tr>
              ) : olts.filter((olt) => olt.ip.includes(searchIp)).length ===
                0 ? (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    Nenhuma OLT encontrada.
                  </td>
                </tr>
              ) : (
                olts
                  .filter((olt) => olt.ip.includes(searchIp))
                  .map((olt) => (
                    <tr key={olt.id}>
                      <td className="col-name">{olt.name}</td>
                      <td className="col-ip">{olt.ip}</td>
                      <td className="col-type">
                        <span className="type-badge">{olt.type}</span>
                      </td>
                      <td className="col-cred">
                        {olt.username ? (
                          <span className="cred-custom">
                            Personalizada ({olt.username})
                          </span>
                        ) : (
                          <span className="cred-universal">Universal</span>
                        )}
                      </td>
                      <td className="col-actions">
                        <button
                          onClick={() => openModal(olt)}
                          className="action-icon-btn"
                          title="Editar"
                        >
                          <Settings size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(olt.id)}
                          className="action-icon-btn delete"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="modal-close"
            >
              <X size={20} />
            </button>

            <h2 className="modal-title">
              {isEditing ? "Editar OLT" : "Nova OLT"}
            </h2>

            <form onSubmit={handleSave} className="modal-form">
              <div className="input-group">
                <label className="input-label">Nome / Identificação</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  placeholder="Ex: OLT Principal"
                  required
                />
              </div>
              <div className="grid-cols-2">
                <div className="input-group">
                  <label className="input-label">Endereço IP</label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="form-input font-mono"
                    placeholder="192.168.1.1"
                    required
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Tipo / Fabricante</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="form-select"
                  >
                    <option value="ZTE">ZTE</option>
                    <option value="Huawei">Huawei</option>
                    <option value="Nokia">Nokia</option>
                  </select>
                </div>
              </div>

              <div className="auth-section">
                <h3 className="auth-title">Autenticação</h3>
                <div className="auth-grid">
                  <div className="input-group">
                    <label className="input-label">Usuário (Opcional)</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="form-input"
                      placeholder="Deixe vazio para usar padrão universal"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Senha (Opcional)</label>
                    <div className="password-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-input"
                        placeholder={
                          isEditing
                            ? "Deixe vazio para manter atual"
                            : "Deixe vazio para usar padrão universal"
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="password-toggle"
                      >
                        {showPassword ? (
                          <EyeOff size={20} />
                        ) : (
                          <Eye size={20} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cancel-modal-btn"
                >
                  Cancelar
                </button>
                <button type="submit" className="save-modal-btn">
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      <StatusManager
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />
      <UniversalConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
};

export default OLTManager;
