import "../styles/AdminPanel.css";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Users,
  Search,
  Trash2,
  Eye,
  EyeOff,
  History,
  User,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const AdminPanel = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("tech");

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const [userSearch, setUserSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [logDate, setLogDate] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, logsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/logs"),
      ]);
      setUsers(usersRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      toast.error("Erro ao carregar dados administrativos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/admin/users", {
        username: newUsername,
        password: newPassword,
        role: newRole,
      });
      toast.success("Usuário criado com sucesso");
      setNewUsername("");
      setNewPassword("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao criar usuário");
    }
  };

  const handleDeleteUser = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja realmente excluir este usuário?")) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success("Usuário excluído");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao excluir");
    }
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword("");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const payload: any = {};
      if (editUsername !== editingUser.username)
        payload.username = editUsername;
      if (editPassword) payload.password = editPassword;

      if (Object.keys(payload).length === 0) {
        setEditingUser(null);
        return;
      }

      await api.put(`/admin/users/${editingUser.id}`, payload);
      toast.success("Usuário atualizado com sucesso");
      setEditingUser(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao atualizar usuário");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const filteredLogs = logs.filter((log) => {
    const isLoginEvent =
      log.action === "User logged in" || log.action === "User logged out";
    if (isLoginEvent) return false;

    const term = logSearch.toLowerCase();

    if (logDate) {
      const logDateString = new Date(log.timestamp).toISOString().split("T")[0];
      if (logDateString !== logDate) return false;
    }

    return (
      log.username.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term))
    );
  });

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div>
          <h1 className="admin-title">Painel Administrativo</h1>
          <p className="admin-subtitle">
            Gerenciamento de usuários e auditoria de logs.
          </p>
        </div>
        <div className="tab-container">
          <button
            onClick={() => setActiveTab("users")}
            className={`tab-button ${activeTab === "users" ? "active" : "inactive"}`}
          >
            Usuários
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`tab-button ${activeTab === "logs" ? "active" : "inactive"}`}
          >
            Logs
          </button>
        </div>
      </header>

      {activeTab === "users" ? (
        <div className="admin-grid">
          <div className="users-panel">
            <div className="panel-header">
              <h3 className="panel-title">
                <Users size={20} className="icon-emerald" />
                Usuários Cadastrados
              </h3>
              <div className="search-container">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Filtrar por nome..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="table-container custom-scrollbar">
              <table className="data-table">
                <thead className="table-head">
                  <tr className="table-header-row">
                    <th>ID</th>
                    <th>Usuário</th>
                    <th>Nível</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openEditModal(u)}
                      className="group"
                    >
                      <td className="cell-id">{u.id}</td>
                      <td className="cell-user">{u.username}</td>
                      <td>
                        <span
                          className={`role-badge ${u.role === "admin" ? "admin" : "tech"}`}
                        >
                          {u.role === "admin" ? "Administrador" : "Técnico"}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          onClick={(e) => handleDeleteUser(u.id, e)}
                          className="delete-btn"
                          title="Excluir Usuário"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="empty-state">Nenhum usuário encontrado.</div>
              )}
            </div>
          </div>

          <div className="create-user-panel">
            <h3 className="create-user-title">Novo Usuário</h3>
            <form onSubmit={handleCreateUser} className="form-group-container">
              <div className="form-group">
                <label className="form-label">Nome de Usuário</label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Senha</label>
                <div className="password-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="password-toggle"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nível de Acesso</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="form-select"
                >
                  <option value="tech">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" className="admin-submit-btn">
                Criar Usuário
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="logs-panel">
          <div className="panel-header logs-header">
            <h3 className="panel-title">
              <History size={20} className="icon-emerald" />
              Logs do Sistema
            </h3>
            <div className="logs-controls">
              <input
                type="date"
                className="date-input"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
              <div className="search-container">
                <Search className="search-icon" size={16} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Filtrar logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="logs-table-container custom-scrollbar">
            <table className="data-table">
              <thead className="table-head">
                <tr className="table-header-row">
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>IP</th>
                  <th>Sistema</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                    onDoubleClick={() => setSelectedLog(log)}
                    title="Clique duas vezes para ver detalhes"
                  >
                    <td className="cell-id whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="cell-user">{log.username}</td>
                    <td>
                      <span className="log-action-badge">{log.action}</span>
                    </td>
                    <td className="cell-ip">{log.ip || "-"}</td>
                    <td className="cell-system" title={log.system}>
                      {log.system || "-"}
                    </td>
                    <td className="cell-details">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content large custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedLog(null)}
              className="close-modal-btn"
            >
              <X size={20} />
            </button>

            <div className="modal-header border-b">
              <div className="modal-icon-wrapper">
                <History size={24} />
              </div>
              <div>
                <h3 className="modal-title">Detalhes do Log</h3>
                <p className="modal-subtitle">
                  ID do evento: #{selectedLog.id}
                </p>
              </div>
            </div>

            <div className="modal-body">
              <div className="info-grid">
                <div>
                  <label className="form-label">Usuário</label>
                  <p className="info-box info-text">{selectedLog.username}</p>
                </div>
                <div>
                  <label className="form-label">Data/Hora</label>
                  <p className="info-box info-text mono">
                    {new Date(selectedLog.timestamp).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>

              <div>
                <label className="form-label">Ação</label>
                <div className="info-box">
                  <span className="log-action-badge">{selectedLog.action}</span>
                </div>
              </div>

              <div className="info-grid">
                <div>
                  <label className="form-label">Endereço IP</label>
                  <p className="info-box info-text mono zinc">
                    {selectedLog.ip || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="form-label">
                    Sistema Operacional / Navegador
                  </label>
                  <div
                    className="info-box info-text zinc cell-system"
                    title={selectedLog.system}
                  >
                    {selectedLog.system || "N/A"}
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label">Detalhes Técnicos</label>
                <div className="info-long-text-container custom-scrollbar">
                  <p className="info-long-text">
                    {selectedLog.details ||
                      "Nenhum detalhe adicional disponível."}
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn-primary"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content medium"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditingUser(null)}
              className="close-modal-btn"
            >
              <X size={20} />
            </button>

            <div className="modal-header">
              <div className="modal-icon-wrapper">
                <User size={24} />
              </div>
              <div>
                <h3 className="modal-title">Editar Usuário</h3>
                <p className="modal-subtitle">Atualize os dados de acesso.</p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="form-group-container">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nova Senha (opcional)</label>
                <div className="password-wrapper">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="form-input"
                    placeholder="Deixe em branco para manter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="password-toggle"
                  >
                    {showEditPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-submit">
                  Salvar
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
