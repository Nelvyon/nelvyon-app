import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield, Lock, Fingerprint, Loader2, AlertTriangle,
  Eye, EyeOff, KeyRound, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoAuthAllowed } from "@/lib/auth";

export default function LoginPage() {
  const { ts } = useI18n();
  const { user, loading, login, enterDemo, loginWithInvite, error: authError } = useAuth();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"main" | "invite">("main");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [showSecurity, setShowSecurity] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!loading && user) {
      if (user.role === "super_admin") {
        navigate("/dashboard");
      } else {
        navigate("/saas");
      }
    }
  }, [user, loading, navigate]);

  const handleAdminLogin = () => {
    if (!isDemoAuthAllowed()) return;
    enterDemo();
  };

  const handleSSO = async () => {
    setSigningIn(true);
    setLoginError(null);
    try {
      await login();
    } catch (err) {
      setLoginError("No se pudo conectar con SSO.");
      setSigningIn(false);
    }
  };

  const handleInviteLogin = () => {
    if (!inviteCode.trim()) {
      setLoginError("Introduce tu código de invitación");
      return;
    }
    if (!inviteName.trim()) {
      setLoginError("Introduce tu nombre");
      return;
    }
    setLoginError(null);
    const result = loginWithInvite(inviteCode.trim(), inviteName.trim());
    if (result.success) {
      navigate("/saas");
    } else {
      setLoginError(result.error || "Código inválido");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-violet-500/50 animate-spin mx-auto mb-3" />
          <p className="text-[10px] text-zinc-700 font-mono">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] relative overflow-hidden flex items-center justify-center">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-900/[0.04] rounded-full blur-[150px]" />
      </div>

      <div className={cn(
        "relative z-10 w-full max-w-sm px-6 transition-all duration-700",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        {/* Back to public site */}
        <a href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-6">
          <ArrowLeft className="w-3 h-3" />
          Volver a nelvyon.com
        </a>

        {/* Minimal Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/80 to-purple-700/80 shadow-xl shadow-violet-500/10 mb-4">
            <span className="text-white font-black text-2xl tracking-tighter">N</span>
          </div>
          <p className="text-[11px] text-zinc-700 font-mono tracking-widest">ACCESO RESTRINGIDO</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0A0A0D] border border-white/[0.04] rounded-2xl p-7 shadow-2xl shadow-black/60">
          {mode === "main" ? (
            <>
              <div className="text-center mb-6">
                <Lock className="w-4 h-4 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Identificación requerida</p>
              </div>

              {(loginError || authError) && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-300/70">{loginError || authError}</p>
                </div>
              )}

              {isDemoAuthAllowed() && (
                <Button
                  onClick={handleAdminLogin}
                  className="w-full h-11 bg-violet-600/90 hover:bg-violet-500/90 text-white font-medium rounded-xl shadow-lg shadow-violet-500/10 transition-all duration-300 hover:shadow-violet-500/20 mb-3 text-sm"
                >
                  <Shield className="w-3.5 h-3.5 mr-2" />
                  Acceso Administrador (demo)
                </Button>
              )}

              {/* SSO */}
              <button
                onClick={handleSSO}
                disabled={signingIn}
                className="w-full h-10 rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] text-xs font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 mb-3"
              >
                {signingIn ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Conectando...</>
                ) : (
                  <><Fingerprint className="w-3 h-3" /> SSO Corporativo</>
                )}
              </button>

              {/* Invite Code Access */}
              <button
                onClick={() => { setMode("invite"); setLoginError(null); }}
                className="w-full h-10 rounded-xl border border-white/[0.04] bg-transparent text-zinc-600 hover:text-zinc-400 text-xs font-medium transition-all flex items-center justify-center gap-2"
              >
                <KeyRound className="w-3 h-3" />
                Tengo un código de invitación
              </button>
            </>
          ) : (
            <>
              <div className="text-center mb-5">
                <KeyRound className="w-4 h-4 text-violet-400/60 mx-auto mb-2" />
                <p className="text-xs text-zinc-500">Introduce tu código de invitación</p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/5 border border-red-500/10 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400/70 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-300/70">{loginError}</p>
                </div>
              )}

              <div className="space-y-3 mb-4">
                <Input
                  placeholder="NVY-XXXX-XXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="bg-[#0F0F12] border-white/[0.06] text-white text-sm h-10 font-mono tracking-wider text-center placeholder:text-zinc-700"
                />
                <Input
                  placeholder="Tu nombre completo"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="bg-[#0F0F12] border-white/[0.06] text-white text-sm h-10 placeholder:text-zinc-700"
                />
              </div>

              <Button
                onClick={handleInviteLogin}
                className="w-full h-10 bg-violet-600/80 hover:bg-violet-500/80 text-white font-medium rounded-xl text-sm mb-3"
              >
                Verificar y Acceder
              </Button>

              <button
                onClick={() => { setMode("main"); setLoginError(null); }}
                className="w-full text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ← Volver
              </button>
            </>
          )}

          {/* Security info toggle */}
          <div className="mt-5 pt-4 border-t border-white/[0.03]">
            <button
              onClick={() => setShowSecurity(!showSecurity)}
              className="flex items-center gap-1.5 text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors"
            >
              {showSecurity ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
              <span>Seguridad</span>
            </button>
            {showSecurity && (
              <div className="mt-2 space-y-1 text-[9px] text-zinc-700 animate-in fade-in duration-300">
                <p>• Cifrado end-to-end AES-256</p>
                <p>• Sin indexación pública</p>
                <p>• Acceso solo por invitación</p>
                <p>• Registro de actividad completo</p>
              </div>
            )}
          </div>
        </div>

        {/* Minimal footer */}
        <p className="text-center text-[9px] text-zinc-800 mt-6 font-mono">
          SISTEMA PRIVADO · NO INDEXADO
        </p>
      </div>
    </div>
  );
}