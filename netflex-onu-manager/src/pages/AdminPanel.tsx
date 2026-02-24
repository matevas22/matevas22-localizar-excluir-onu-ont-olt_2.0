import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

  // Create user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("tech");

  // Edit user state
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Search filter
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
    e.stopPropagation(); // Prevent opening edit modal
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
    setEditPassword(""); // Reset password field
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
    // Filter out login/logout events if requested
    const isLoginEvent =
      log.action === "User logged in" || log.action === "User logged out";
    if (isLoginEvent) return false;

    const term = logSearch.toLowerCase();

    // Filter by date if set
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
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Painel Administrativo
          </h1>
          <p className="text-zinc-400">
            Gerenciamento de usuários e auditoria de logs.
          </p>
        </div>
        <div className="flex bg-[#141414] border border-white/10 rounded-xl p-1">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "users" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-white"}`}
          >
            Usuários
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === "logs" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-500 hover:text-white"}`}
          >
            Logs
          </button>
        </div>
      </header>

      {activeTab === "users" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-[#141414] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users size={20} className="text-emerald-500" />
                Usuários Cadastrados
              </h3>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={16}
                />
                <input
                  type="text"
                  className="bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-64"
                  placeholder="Filtrar por nome..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#141414] z-10 shadow-sm">
                  <tr className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-white/5">
                    <th className="px-6 py-4 bg-[#141414]">ID</th>
                    <th className="px-6 py-4 bg-[#141414]">Usuário</th>
                    <th className="px-6 py-4 bg-[#141414]">Nível</th>
                    <th className="px-6 py-4 bg-[#141414] text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => openEditModal(u)}
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 text-zinc-500 font-mono text-xs">
                        {u.id}
                      </td>
                      <td className="px-6 py-4 text-white font-medium group-hover:text-emerald-400 transition-colors">
                        {u.username}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${u.role === "admin" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}
                        >
                          {u.role === "admin" ? "Administrador" : "Técnico"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => handleDeleteUser(u.id, e)}
                          className="text-zinc-600 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-all opacity-50 group-hover:opacity-100"
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
                <div className="p-8 text-center text-zinc-500 italic">
                  Nenhum usuário encontrado.
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 h-fit">
            <h3 className="text-lg font-semibold text-white mb-6">
              Novo Usuário
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>
              <div>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Nível de Acesso
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value="tech">Técnico</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Criar Usuário
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/5 bg-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <History size={20} className="text-emerald-500" />
              Logs do Sistema
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <input
                type="date"
                className="bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={16}
                />
                <input
                  type="text"
                  className="bg-black/50 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-full sm:w-64"
                  placeholder="Filtrar logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#141414] z-10 shadow-lg">
                <tr className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold border-b border-white/5">
                  <th className="px-6 py-4 bg-[#141414]">Data/Hora</th>
                  <th className="px-6 py-4 bg-[#141414]">Usuário</th>
                  <th className="px-6 py-4 bg-[#141414]">Ação</th>
                  <th className="px-6 py-4 bg-[#141414]">IP</th>
                  <th className="px-6 py-4 bg-[#141414]">Sistema</th>
                  <th className="px-6 py-4 bg-[#141414]">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {log.username}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs font-mono">
                      {log.ip || "-"}
                    </td>
                    <td
                      className="px-6 py-4 text-zinc-400 text-[10px] max-w-[150px] truncate"
                      title={log.system}
                    >
                      {log.system || "-"}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-sm">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setEditingUser(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                <User size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Editar Usuário</h3>
                <p className="text-zinc-500 text-sm">
                  Atualize os dados de acesso.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Nova Senha (opcional)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Deixe em branco para manter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                  >
                    {showEditPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all"
                >
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
