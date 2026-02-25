import "../styles/Profile.css";
import React, { useState } from "react";
import { Key, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

const Profile = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/change-password", { currentPassword, newPassword });
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <header>
        <h1 className="profile-title">Meu Perfil</h1>
        <p className="profile-subtitle">
          Gerencie suas informações e segurança.
        </p>
      </header>

      <div className="profile-card">
        <div className="profile-card-header">
          <div className="profile-avatar">
            {localStorage.getItem("username")?.[0].toUpperCase()}
          </div>
          <div>
            <h2 className="profile-username">
              {localStorage.getItem("username")}
            </h2>
            <p className="profile-role">{localStorage.getItem("role")}</p>
          </div>
        </div>

        <div className="profile-body">
          <h3 className="section-title">
            <Key size={20} className="icon-emerald" />
            Alterar Senha
          </h3>
          <form onSubmit={handlePasswordChange} className="profile-form">
            <div>
              <label className="form-label">Senha Atual</label>
              <div className="password-input-wrapper">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="password-toggle-btn"
                >
                  {showCurrent ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="form-grid">
              <div>
                <label className="form-label">Nova Senha</label>
                <div className="password-input-wrapper">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="password-toggle-btn"
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="form-label">Confirmar Nova Senha</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="password-toggle-btn"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="profile-submit-btn"
            >
              {loading ? (
                <Loader2 className="spinner" size={20} />
              ) : (
                "Atualizar Senha"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
