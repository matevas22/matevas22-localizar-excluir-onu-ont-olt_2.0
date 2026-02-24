import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Key, Settings, Loader2, Trash2, X, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";
import StatusManager from "../components/StatusManager";
import UniversalConfigModal from "../components/UniversalConfigModal";

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
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Gerenciamento de OLTs
          </h1>
          <p className="text-zinc-400">Configure as OLTs e suas credenciais.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Key className="w-5 h-5" />
            Credenciais Universais
          </button>
          <button
            onClick={() => setIsStatusModalOpen(true)}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Gerenciar Status
          </button>
          <button
            onClick={() => openModal()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2"
          >
            <Settings className="w-5 h-5" />
            Adicionar OLT
          </button>
        </div>
      </header>

      <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filtrar por IP..."
            value={searchIp}
            onChange={(e) => setSearchIp(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#141414] z-10 shadow-sm">
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  Nome
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  IP
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  Tipo
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  Credencial
                </th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider bg-[#141414]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Carregando...
                  </td>
                </tr>
              ) : olts.filter((olt) => olt.ip.includes(searchIp)).length ===
                0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-zinc-500"
                  >
                    Nenhuma OLT encontrada.
                  </td>
                </tr>
              ) : (
                olts
                  .filter((olt) => olt.ip.includes(searchIp))
                  .map((olt) => (
                    <tr
                      key={olt.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4 text-white font-medium">
                        {olt.name}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-mono text-sm">
                        {olt.ip}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 text-[10px] font-bold uppercase">
                          {olt.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">
                        {olt.username ? (
                          <span className="text-emerald-400">
                            Personalizada ({olt.username})
                          </span>
                        ) : (
                          <span className="text-yellow-500">Universal</span>
                        )}
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => openModal(olt)}
                          className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Settings size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(olt.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-red-500 transition-colors"
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#141414] border border-white/10 rounded-2xl max-w-lg w-full p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6">
              {isEditing ? "Editar OLT" : "Nova OLT"}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                  Nome / Identificação
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: OLT Principal"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Endereço IP
                  </label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 font-mono"
                    placeholder="192.168.1.1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                    Tipo / Fabricante
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ZTE">ZTE</option>
                    <option value="Huawei">Huawei</option>
                    <option value="Nokia">Nokia</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <h3 className="text-sm font-bold text-white mb-4">
                  Autenticação
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Usuário (Opcional)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Deixe vazio para usar padrão universal"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                      Senha (Opcional)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                        placeholder={
                          isEditing
                            ? "Deixe vazio para manter atual"
                            : "Deixe vazio para usar padrão universal"
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
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

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
