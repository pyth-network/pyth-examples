import { useWallet, useWalletList } from "@meshsdk/react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const ff = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif";

export default function Wallet() {
  const wallets = useWalletList();
  const { connect, disconnect, connected, name } = useWallet();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => setVisible(true));
    } else {
      document.body.style.overflow = "";
      setVisible(false);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleConnect = async (walletName: string) => {
    setConnecting(walletName);
    try {
      await connect(walletName);
      setOpen(false);
    } catch (e) {
      console.error("Error connecting wallet:", e);
    } finally {
      setConnecting(null);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 250);
  };

  const modal = open ? (
    <div
      onClick={handleClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(28,28,30,0.96)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "24px",
          width: 340,
          maxHeight: "60vh",
          overflowY: "auto",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          transform: visible
            ? "scale(1) translateY(0)"
            : "scale(0.95) translateY(16px)",
          transition:
            "transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease",
          opacity: visible ? 1 : 0,
          fontFamily: ff,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              color: "#f5f5f7",
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: "-0.2px",
            }}
          >
            Connect Wallet
          </span>
          <button
            onClick={handleClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#98989d",
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontFamily: ff,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
            }
          >
            ✕
          </button>
        </div>

        <p style={{ color: "#98989d", fontSize: 13, marginBottom: 16 }}>
          Select a wallet to continue
        </p>

        <div
          style={{
            height: 1,
            background: "rgba(255,255,255,0.07)",
            marginBottom: 16,
          }}
        />

        {wallets.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "#98989d",
              fontSize: 14,
            }}
          >
            No wallets detected.
            <br />
            <span style={{ color: "#f5f5f7" }}>
              Install Lace, Yoroi or Vespr.
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => handleConnect(wallet.name)}
                disabled={!!connecting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background:
                    connecting === wallet.name
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "12px 14px",
                  cursor: connecting ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                  width: "100%",
                  textAlign: "left",
                  fontFamily: ff,
                }}
                onMouseEnter={(e) => {
                  if (!connecting)
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                }}
                onMouseLeave={(e) => {
                  if (!connecting)
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
              >
                <img
                  src={wallet.icon}
                  alt={wallet.name}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{ color: "#f5f5f7", fontSize: 15, fontWeight: 500 }}
                  >
                    {wallet.name}
                  </div>
                  <div style={{ color: "#98989d", fontSize: 12, marginTop: 1 }}>
                    {connecting === wallet.name
                      ? "Connecting..."
                      : "Cardano Wallet"}
                  </div>
                </div>

                {connecting !== wallet.name ? (
                  <span style={{ color: "#98989d", fontSize: 18 }}>›</span>
                ) : (
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderTopColor: "#0071e3",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  ) : null;

  return (
    <>
      {/* Botón principal */}
      {connected ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 980,
            padding: "6px 16px 6px 10px",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#30d158",
              boxShadow: "0 0 6px #30d158",
            }}
          />
          <span
            style={{
              color: "#f5f5f7",
              fontSize: 14,
              fontWeight: 500,
              fontFamily: ff,
            }}
          >
            {name}
          </span>
          <button
            onClick={disconnect}
            style={{
              marginLeft: 4,
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: 980,
              color: "#98989d",
              fontSize: 12,
              padding: "3px 10px",
              cursor: "pointer",
              fontFamily: ff,
            }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{
            background: "#0071e3",
            border: "none",
            borderRadius: 980,
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            padding: "8px 20px",
            cursor: "pointer",
            fontFamily: ff,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#0077ed")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#0071e3")}
        >
          Connect Wallet
        </button>
      )}

      {/* Portal — renderiza fuera del navbar, directo en body */}
      {createPortal(modal, document.body)}
    </>
  );
}
