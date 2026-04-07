import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ClipboardCopy,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Power,
  RefreshCw,
  Save,
  SignalHigh,
  Wifi,
  WifiOff,
  X,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import api from "../services/api";

interface OnuDetailModalProps {
  open: boolean;
  onClose: () => void;
  oltIp: string;
  oltName: string;
  port: string;
  onu: any;
}

type TabKey = "summary" | "wifi";

type WifiBand = "1" | "5";

type WifiFormState = {
  name: string;
  password: string;
};

const OnuDetailModal = ({
  open,
  onClose,
  oltIp,
  oltName,
  port,
  onu,
}: OnuDetailModalProps) => {
  const [tab, setTab] = useState<TabKey>("summary");
  const [details, setDetails] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [wifiForms, setWifiForms] = useState<Record<WifiBand, WifiFormState>>({
    1: { name: "", password: "" },
    5: { name: "", password: "" },
  });
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingWifiBand, setSavingWifiBand] = useState<WifiBand | null>(null);
  const [rebooting, setRebooting] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const onuInterface = useMemo(() => {
    if (onu?.interface) {
      return onu.interface;
    }
    if (!port || !onu) return "";
    const shortPort = port.replace(/^gpon-olt_/, "");
    return `gpon-onu_${shortPort}:${onu.onu_id}`;
  }, [port, onu]);

  const loadDetails = async () => {
    if (!open || !oltIp || !onuInterface) return;

    setLoading(true);
    setDetails(null);

    try {
      const res = await api.get("/onu/interface-info", {
        params: {
          olt_ip: oltIp,
          interface: onuInterface,
        },
      });

      setDetails(res.data);
      setName(res.data?.name || "");
      setPassword("");
      setWifiForms({
        1: { name: res.data?.wifi?.ssid1 || "", password: "" },
        5: { name: res.data?.wifi?.ssid5 || "", password: "" },
      });
      setTab("summary");
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || "Erro ao carregar detalhes da ONU",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDetails();
    } else {
      setDetails(null);
      setPassword("");
      setName("");
      setWifiForms({
        1: { name: "", password: "" },
        5: { name: "", password: "" },
      });
      setShowPassword(false);
      setTab("summary");
    }
  }, [open, oltIp, onuInterface]);

  useEffect(() => {}, [open, tab, details?.sn]);

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details?.sn) return;
    if (!password.trim()) {
      toast.warn("Informe a nova senha");
      return;
    }

    setSavingPassword(true);
    try {
      await api.post(`/onu/acs/${details.sn}/password`, {
        new_password: password.trim(),
        olt_ip: oltIp,
        interface: onuInterface,
      });
      toast.success("Senha alterada com sucesso");
      setPassword("");
      loadDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao alterar senha");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details?.sn) return;
    if (!name.trim()) {
      toast.warn("Informe o novo nome");
      return;
    }

    setSavingName(true);
    try {
      await api.post(`/onu/acs/${details.sn}/name`, {
        new_name: name.trim(),
        olt_ip: oltIp,
        interface: onuInterface,
      });
      toast.success("Nome alterado com sucesso");
      loadDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao alterar nome");
    } finally {
      setSavingName(false);
    }
  };

  const handleWifiChange = (
    band: WifiBand,
    field: keyof WifiFormState,
    value: string,
  ) => {
    setWifiForms((prev) => ({
      ...prev,
      [band]: {
        ...prev[band],
        [field]: value,
      },
    }));
  };

  const handleWifiSave = async (band: WifiBand, e: React.FormEvent) => {
    e.preventDefault();
    if (!details?.sn) return;

    const form = wifiForms[band];
    if (!form.name.trim() && !form.password.trim()) {
      toast.warn("Informe o nome ou a senha da SSID");
      return;
    }

    setSavingWifiBand(band);
    try {
      await api.post(`/onu/acs/${details.sn}/wifi`, {
        band,
        ssid_name: form.name.trim(),
        ssid_password: form.password.trim(),
        olt_ip: oltIp,
        interface: onuInterface,
      });
      toast.success(`SSID ${band} atualizada com sucesso`);
      setWifiForms((prev) => ({
        ...prev,
        [band]: {
          ...prev[band],
          password: "",
        },
      }));
      loadDetails();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao atualizar SSID");
    } finally {
      setSavingWifiBand(null);
    }
  };

  const handleReboot = async () => {
    if (!details?.sn) return;

    setRebooting(true);
    try {
      await api.post(`/onu/acs/${details.sn}/reboot`, {
        olt_ip: oltIp,
        interface: onuInterface,
      });
      toast.success("Reboot solicitado com sucesso");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao reiniciar ONU");
    } finally {
      setRebooting(false);
    }
  };

  const handleRestore = async () => {
    if (!details?.sn) return;

    setRestoring(true);
    try {
      await api.post(`/onu/acs/${details.sn}/restore`, {
        olt_ip: oltIp,
        interface: onuInterface,
      });
      toast.success("Restore solicitado com sucesso");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Erro ao restaurar ONU");
    } finally {
      setRestoring(false);
    }
  };

  const signal = details?.signals || {};
  const wifi = details?.wifi || {};

  return (
    <AnimatePresence>
      {open && (
        <div className="onu-detail-overlay" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="onu-detail-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="onu-detail-header">
              <div>
                <p className="onu-detail-kicker">ONU Manager</p>
                <h2>{details?.sn || onu?.onu_id || "Detalhes da ONU"}</h2>
                <p className="onu-detail-subtitle">
                  {oltName} · {port} ·{" "}
                  {onuInterface || "interface indisponível"}
                </p>
              </div>

              <div className="onu-detail-header-actions">
                <button
                  className="onu-icon-btn"
                  onClick={loadDetails}
                  title="Atualizar"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  className="onu-icon-btn"
                  onClick={onClose}
                  title="Fechar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="onu-detail-loading">
                <Loader2 className="animate-spin" size={32} />
                <p>Carregando informações da ONU...</p>
              </div>
            ) : (
              <div className="onu-detail-body">
                <aside className="onu-detail-sidebar">
                  <div className="onu-summary-card">
                    <div className="onu-summary-top">
                      <div>
                        <span className="onu-pill">OLT</span>
                        <h3>{oltName}</h3>
                        <p>{oltIp}</p>
                      </div>
                      <button
                        className="onu-copy-btn"
                        onClick={() =>
                          handleCopy(details?.sn || onuInterface || "")
                        }
                        title="Copiar"
                      >
                        <ClipboardCopy size={16} />
                      </button>
                    </div>

                    <div className="onu-status-chip">
                      <SignalHigh size={16} />
                      {details?.status_description ||
                        details?.status ||
                        "Status indisponível"}
                    </div>

                    <div className="onu-summary-grid">
                      <div>
                        <span>SN</span>
                        <strong>{details?.sn || "N/A"}</strong>
                      </div>
                      <div>
                        <span>Interface</span>
                        <strong>{onuInterface}</strong>
                      </div>
                      <div>
                        <span>Nome</span>
                        <strong>{details?.name || "N/A"}</strong>
                      </div>
                      <div>
                        <span>Uptime</span>
                        <strong>{details?.uptime || "N/A"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="onu-action-stack">
                    <button
                      className="onu-action-btn"
                      onClick={handleReboot}
                      disabled={rebooting}
                    >
                      {rebooting ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Power size={16} />
                      )}
                      {rebooting ? "Reiniciando..." : "Reboot"}
                    </button>
                    <button
                      className="onu-action-btn warning"
                      onClick={handleRestore}
                      disabled={restoring}
                    >
                      {restoring ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <RotateCcw size={16} />
                      )}
                      {restoring ? "Restaurando..." : "Restore"}
                    </button>
                  </div>

                  <div className="onu-tabs">
                    {[
                      { key: "summary", label: "Resumo" },
                      { key: "wifi", label: "Wi-Fi" },
                    ].map((item) => (
                      <button
                        key={item.key}
                        className={`onu-tab ${tab === item.key ? "active" : ""}`}
                        onClick={() => setTab(item.key as TabKey)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </aside>

                <main className="onu-detail-main">
                  {tab === "summary" && (
                    <section className="onu-panel-card">
                      <div className="onu-panel-head">
                        <h3>Resumo de login</h3>
                        <p>
                          Identificação principal da ONU para acesso e
                          gerenciamento.
                        </p>
                      </div>

                      <div className="onu-signal-grid">
                        <div className="onu-signal-card emerald">
                          <span>RX ONU</span>
                          <strong>
                            {typeof signal.rxOnu === "number"
                              ? signal.rxOnu.toFixed(2)
                              : signal.rxOnu || "N/A"}
                          </strong>
                          <small>dBm</small>
                        </div>
                        <div className="onu-signal-card blue">
                          <span>TX ONU</span>
                          <strong>
                            {typeof signal.txOnu === "number"
                              ? signal.txOnu.toFixed(2)
                              : signal.txOnu || "N/A"}
                          </strong>
                          <small>dBm</small>
                        </div>
                        <div className="onu-signal-card violet">
                          <span>RX OLT</span>
                          <strong>
                            {typeof signal.rxOlt === "number"
                              ? signal.rxOlt.toFixed(2)
                              : signal.rxOlt || "N/A"}
                          </strong>
                          <small>dBm</small>
                        </div>
                        <div className="onu-signal-card amber">
                          <span>TX OLT</span>
                          <strong>
                            {typeof signal.txOlt === "number"
                              ? signal.txOlt.toFixed(2)
                              : signal.txOlt || "N/A"}
                          </strong>
                          <small>dBm</small>
                        </div>
                      </div>

                      <div className="onu-info-grid">
                        <div className="onu-info-card">
                          <span>OLT</span>
                          <strong>{oltName}</strong>
                        </div>
                        <div className="onu-info-card">
                          <span>OLT IP</span>
                          <strong>{oltIp}</strong>
                        </div>
                        <div className="onu-info-card">
                          <span>Distância</span>
                          <strong>{details?.distance || "N/A"}</strong>
                        </div>
                        <div className="onu-info-card">
                          <span>Status</span>
                          <strong>
                            {details?.status_description ||
                              details?.status ||
                              "N/A"}
                          </strong>
                        </div>
                      </div>
                    </section>
                  )}

                  {tab === "wifi" && (
                    <section className="onu-panel-card">
                      <div className="onu-panel-head">
                        <h3>Wi-Fi</h3>
                        <p>SSID 1 e SSID 5 mais importantes do equipamento.</p>
                      </div>

                      <div className="wifi-edit-grid">
                        {(["1", "5"] as WifiBand[]).map((band) => (
                          <form
                            key={band}
                            className="wifi-card wifi-form-card"
                            onSubmit={(e) => handleWifiSave(band, e)}
                          >
                            <div className="wifi-card-title">
                              <Wifi size={18} /> SSID {band}
                            </div>
                            <p className="wifi-current-value">
                              Atual:{" "}
                              {band === "1"
                                ? wifi.ssid1 || "N/A"
                                : wifi.ssid5 || "N/A"}
                            </p>

                            <div className="onu-inline-form wifi-inline-form">
                              <div className="onu-form-field">
                                <label>Nome da SSID</label>
                                <input
                                  type="text"
                                  value={wifiForms[band].name}
                                  onChange={(e) =>
                                    handleWifiChange(
                                      band,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  placeholder={`Nome da SSID ${band}`}
                                />
                              </div>
                              <div className="onu-form-field">
                                <label>Senha da SSID</label>
                                <input
                                  type="text"
                                  value={wifiForms[band].password}
                                  onChange={(e) =>
                                    handleWifiChange(
                                      band,
                                      "password",
                                      e.target.value,
                                    )
                                  }
                                  placeholder="Senha WPA/WPA2"
                                />
                              </div>
                            </div>

                            <div className="wifi-card-actions">
                              <button
                                type="button"
                                className="onu-secondary-btn"
                                onClick={() =>
                                  setWifiForms((prev) => ({
                                    ...prev,
                                    [band]: {
                                      name:
                                        band === "1"
                                          ? wifi.ssid1 || ""
                                          : wifi.ssid5 || "",
                                      password: "",
                                    },
                                  }))
                                }
                              >
                                Restaurar valor atual
                              </button>
                              <button
                                type="submit"
                                className="onu-primary-btn"
                                disabled={savingWifiBand === band}
                              >
                                {savingWifiBand === band ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <Save size={16} />
                                )}
                                {savingWifiBand === band
                                  ? "Salvando..."
                                  : "Salvar SSID"}
                              </button>
                            </div>
                          </form>
                        ))}
                      </div>

                      <div className="wifi-raw-block">
                        <h4>Linhas detectadas</h4>
                        {wifi.raw?.length ? (
                          <div className="raw-list">
                            {wifi.raw.map((line: string, index: number) => (
                              <div
                                key={`${line}-${index}`}
                                className="raw-line"
                              >
                                {line}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-inline">
                            <WifiOff size={18} /> Nenhuma informação de SSID
                            retornada.
                          </div>
                        )}
                      </div>
                    </section>
                  )}
                </main>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OnuDetailModal;
