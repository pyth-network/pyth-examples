import { useState, useEffect } from "react";
import { Bell, ChevronDown, Shield, Wallet, WifiOff, Sun, Moon, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { supabase, Profile } from "../lib/supabase";
import AuthModal from "./AuthModal";

interface HeaderProps {
  currentPrice: number;
  isLive: boolean;
}

const ASSETS = ["ADA/USD", "BTC/USD", "ETH/USD", "SOL/USD"];

// Convierte hex CBOR address a visualización bech32 abreviada
// CIP-30 retorna las directions en hex. Para mostrar buscamos el prefijo estándar
// o simplemente abreviamos: "addr1q..." (primeros/últimos chars)
function formatAddr(hexAddr: string): string {
  if (!hexAddr) return "";
  // Heurística: si empieza con "01" es una address de pago Shelley (mainnet)
  // Lo mostramos como addr1...XXXX sin conversión pesada
  const short = hexAddr.slice(0, 8).toLowerCase();
  const tail   = hexAddr.slice(-6).toLowerCase();
  return `addr1…${short}…${tail}`;
}

// Convierte Lovelace (hex CBOR) a ADA (número)
function lovelaceToAda(hexBalance: string): string {
  try {
    // CIP-30 devuelve el balance como número hex simple en muchos wallets
    const lovelace = parseInt(hexBalance, 16);
    if (isNaN(lovelace)) return "0.00";
    return (lovelace / 1_000_000).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } catch {
    return "0.00";
  }
}

type WalletState = "disconnected" | "connecting" | "connected" | "no_lace" | "error";

export default function Header({ currentPrice, isLive }: HeaderProps) {
  const [selectedAsset, setSelectedAsset] = useState("ADA/USD");
  const [assetOpen, setAssetOpen]         = useState(false);
  const [authOpen, setAuthOpen]           = useState(false);
  const [profile, setProfile]             = useState<Profile | null>(null);
  const [isLight, setIsLight]             = useState(false);

  // Wallet state
  const [walletState, setWalletState]     = useState<WalletState>("disconnected");
  const [walletAddr, setWalletAddr]       = useState("");
  const [walletBalance, setWalletBalance] = useState("");
  const [walletError, setWalletError]     = useState("");

  const toggleTheme = () => {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.setAttribute("data-theme", next ? "light" : "dark");
  };

  // Supabase auth
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        if (data) setProfile(data as Profile);
      }
    });
    supabase.auth.onAuthStateChange(async (_ev, session) => {
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
        setProfile(data as Profile ?? null);
      } else setProfile(null);
    });
  }, []);

  // ── Lace Wallet CIP-30 ──────────────────────────────────────────────────────
  const connectLace = async () => {
    const lace = window.cardano?.lace;

    if (!lace) {
      setWalletState("no_lace");
      return;
    }

    try {
      setWalletState("connecting");
      setWalletError("");

      // Solicitar habilitación al usuario (abre popup de Lace)
      const api = await lace.enable();

      // Obtener dirección de cambio (primera dirección usable)
      const changeAddrHex = await api.getChangeAddress();
      setWalletAddr(formatAddr(changeAddrHex));

      // Obtener balance en lovelace
      const balanceHex = await api.getBalance();
      setWalletBalance(lovelaceToAda(balanceHex));

      setWalletState("connected");
    } catch (err: any) {
      // El usuario rechazó la conexión o hubo un error
      const msg = err?.message ?? "Error al conectar";
      if (msg.includes("cancel") || msg.includes("user declined") || msg.includes("rejected")) {
        setWalletState("disconnected");
      } else {
        setWalletError(msg);
        setWalletState("error");
      }
    }
  };

  const disconnectWallet = () => {
    setWalletState("disconnected");
    setWalletAddr("");
    setWalletBalance("");
    setWalletError("");
  };

  // ── UI helpers ──────────────────────────────────────────────────────────────

  const WalletWidget = () => {
    if (walletState === "connected") {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            title="Haz clic para desconectar"
            onClick={disconnectWallet}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--surface-container)", border: "1px solid var(--buy)",
              borderRadius: "var(--radius-sm)", padding: "0.35rem 0.75rem", cursor: "pointer" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--buy)", boxShadow: "0 0 6px var(--buy)", display: "inline-block", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--on-background)", lineHeight: 1.2 }}>
                {walletAddr}
              </span>
              {walletBalance && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--buy)", lineHeight: 1.2 }}>
                  {walletBalance} ADA
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (walletState === "connecting") {
      return (
        <button className="wallet-btn" disabled style={{ opacity: 0.7, cursor: "not-allowed" }}>
          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
          Conectando…
        </button>
      );
    }

    if (walletState === "no_lace") {
      return (
        <a
          href="https://www.lace.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="wallet-btn"
          style={{ textDecoration: "none", color: "var(--sell)", borderColor: "var(--sell)", background: "var(--sell-container)" }}
          title="Lace Wallet no detectada — haz clic para instalarla"
        >
          <ExternalLink size={13} />
          Instalar Lace
        </a>
      );
    }

    if (walletState === "error") {
      return (
        <button className="wallet-btn"
          title={walletError}
          onClick={connectLace}
          style={{ color: "var(--sell)", borderColor: "var(--sell)", background: "var(--sell-container)" }}>
          <AlertCircle size={13} />
          Reintentar
        </button>
      );
    }

    // disconnected (default)
    return (
      <button className="wallet-btn" onClick={connectLace}>
        <Wallet size={13} />
        Conectar Lace
      </button>
    );
  };

  return (
    <>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onProfileSaved={setProfile} existingProfile={profile} />
      <header className="header">
        {/* Izquierda: Logo + Estado de Red */}
        <a className="header-logo">
          <Shield size={18} />
          PythGuard
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span className={`status-dot ${isLive ? "live" : "offline"}`} />
          {isLive ? (
            <span style={{ fontSize: "0.75rem", color: "var(--buy)", fontWeight: 600 }}>Red en Vivo</span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", color: "var(--on-surface)" }}>
              <WifiOff size={12} /> Sin Conexión
            </span>
          )}
        </div>

        <div className="header-divider" />

        {/* Selector de Activo */}
        <div style={{ position: "relative" }}>
          <button className="asset-select" onClick={() => setAssetOpen(o => !o)}>
            {selectedAsset}
            <ChevronDown size={14} style={{ color: "var(--on-surface)", transform: assetOpen ? "rotate(180deg)" : undefined, transition: "200ms" }} />
          </button>
          {assetOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 200,
              background: "var(--surface-container)", border: "1px solid var(--outline)",
              borderRadius: "var(--radius-sm)", overflow: "hidden", minWidth: "120px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
            }}>
              {ASSETS.map(a => (
                <button key={a} onClick={() => { setSelectedAsset(a); setAssetOpen(false); }}
                  style={{ display: "block", width: "100%", padding: "0.5rem 0.85rem",
                    background: a === selectedAsset ? "var(--primary-container)" : "transparent",
                    border: "none", cursor: "pointer", textAlign: "left",
                    fontFamily: "var(--font-editorial)", fontWeight: 600, fontSize: "0.85rem",
                    color: a === selectedAsset ? "var(--primary-light)" : "var(--on-background)" }}>
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Precio actual inline */}
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "1rem", color: "var(--on-background)" }}>
          ${currentPrice.toFixed(6)}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Wallet + Controles */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <WalletWidget />

          <div className="header-divider" />

          {/* Tema claro/oscuro */}
          <button className="icon-btn" aria-label="Cambiar tema" onClick={toggleTheme} title={isLight ? "Modo oscuro" : "Modo claro"}>
            {isLight ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {/* Notificaciones */}
          <button className="icon-btn" aria-label="Notificaciones">
            <Bell size={15} />
            <span className="notification-dot" />
          </button>

          {/* Perfil */}
          <button
            style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer" }}
            onClick={() => setAuthOpen(true)}
            aria-label="Mi perfil"
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Perfil" className="profile-pic" />
            ) : (
              <div className="icon-btn" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary-light)" }}>
                {profile?.full_name ? profile.full_name[0].toUpperCase() : "U"}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Spinner keyframe (inyectado inline para no contaminar index.css) */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
