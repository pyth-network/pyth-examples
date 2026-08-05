import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User } from "lucide-react";
import { supabase, Profile } from "../lib/supabase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileSaved: (profile: Profile) => void;
  existingProfile: Profile | null;
}

export default function AuthModal({ isOpen, onClose, onProfileSaved, existingProfile }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [fullName, setFullName] = useState(existingProfile?.full_name ?? "");
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for session changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Pre-fill name from existing profile
  useEffect(() => {
    if (existingProfile?.full_name) {
      setFullName(existingProfile.full_name);
    } else if (session?.user?.user_metadata?.full_name) {
      setFullName(session.user.user_metadata.full_name);
    }
  }, [existingProfile, session]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!session?.user) return;
    setSaveLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: session.user.id,
        email: session.user.email,
        full_name: fullName.trim(),
        avatar_url: session.user.user_metadata?.avatar_url ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      setError(error.message);
    } else if (data) {
      onProfileSaved(data as Profile);
      onClose();
    }
    setSaveLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(47, 50, 61, 0.6)",
          backdropFilter: "blur(6px)",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            background: "var(--surface-container-lowest)",
            borderRadius: "24px",
            padding: "2.5rem",
            width: "100%",
            maxWidth: "420px",
            boxShadow: "0 24px 60px rgba(101, 73, 192, 0.14)",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "1.25rem",
              right: "1.25rem",
              border: "none",
              background: "var(--surface-container)",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--outline)",
            }}
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }}>
            {session?.user ? (
              <>
                {session.user.user_metadata?.avatar_url ? (
                  <img
                    src={session.user.user_metadata.avatar_url}
                    alt="Profile"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      margin: "0 auto 1rem",
                      display: "block",
                      objectFit: "cover",
                      boxShadow: "0 0 0 4px var(--primary-container)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "var(--secondary-container)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 1rem",
                    }}
                  >
                    <User size={36} color="var(--primary)" />
                  </div>
                )}
                <h2 className="text-editorial" style={{ fontSize: "1.4rem", color: "var(--on-background)" }}>
                  Hola, {session.user.user_metadata?.name?.split(" ")[0] ?? "Operador"} 👋
                </h2>
                <p className="text-muted">{session.user.email}</p>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "var(--secondary-container)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}
                >
                  <User size={32} color="var(--primary)" />
                </div>
                <h2 className="text-editorial" style={{ fontSize: "1.4rem" }}>
                  Ingresar a PythGuard
                </h2>
                <p className="text-muted" style={{ marginTop: "0.5rem" }}>
                  Accedé con tu cuenta de Google para guardar tu perfil.
                </p>
              </>
            )}
          </div>

          {/* Content */}
          {session?.user ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label className="text-muted" style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Nombre y Apellido
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Ana García"
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    borderRadius: "12px",
                    border: "1.5px solid var(--surface-container)",
                    background: "var(--surface-container-low)",
                    color: "var(--on-background)",
                    fontFamily: "var(--font-body)",
                    fontSize: "1rem",
                    outline: "none",
                    transition: "border-color 200ms",
                  }}
                  onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                  onBlur={(e) => e.target.style.borderColor = "var(--surface-container)"}
                />
              </div>

              {error && (
                <p style={{ color: "var(--error)", fontSize: "0.85rem", background: "rgba(168,54,75,0.08)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
                  {error}
                </p>
              )}

              <button
                onClick={handleSaveProfile}
                disabled={saveLoading || !fullName.trim()}
                className="btn-primary"
                style={{ width: "100%", padding: "0.875rem", opacity: saveLoading || !fullName.trim() ? 0.6 : 1 }}
              >
                {saveLoading ? "Guardando..." : "Guardar Perfil"}
              </button>

              <button
                onClick={handleSignOut}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "9999px",
                  background: "transparent",
                  border: "1.5px solid var(--surface-container)",
                  color: "var(--outline)",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {error && (
                <p style={{ color: "var(--error)", fontSize: "0.85rem", background: "rgba(168,54,75,0.08)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
                  {error}
                </p>
              )}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "9999px",
                  background: "var(--surface-container-low)",
                  border: "1.5px solid var(--surface-container)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-editorial)",
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "var(--on-background)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? "Conectando..." : "Continuar con Google"}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
