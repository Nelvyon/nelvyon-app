import { useEffect, useState, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verifyPayment, type VerifyResult } from "@/lib/payment-service";
import {
  CheckCircle2, Loader2, XCircle, ArrowRight, Crown,
  Shield, Sparkles, Zap, BarChart3, Users, Bot,
  Rocket, PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ─── Confetti Canvas ─── */
function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ["#7C3AED", "#10B981", "#F59E0B", "#EC4899", "#3B82F6", "#EF4444", "#06B6D4"];
    const particles: Array<{
      x: number; y: number; w: number; h: number;
      color: string; vx: number; vy: number; rot: number; vr: number; opacity: number;
    }> = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 8 + 4,
        h: Math.random() * 6 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 4 + 2,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        opacity: 1,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.vy += 0.05;
        if (p.y > canvas.height) p.opacity -= 0.02;
        if (p.opacity <= 0) return;
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (alive) animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

export default function SaasPaymentSuccess() {
  const { ts } = useI18n();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setStatus("error");
      setError("No se encontró session_id en la URL");
      return;
    }

    const verify = async () => {
      try {
        const res = await verifyPayment(sessionId);
        setResult(res);
        if (res.payment_status === "paid" || res.status === "paid") {
          setStatus("success");
          setShowConfetti(true);
          setTimeout(() => setAnimated(true), 200);
          setTimeout(() => setShowConfetti(false), 6000);
        } else {
          setStatus("error");
          setError(`Estado del pago: ${res.payment_status}`);
        }
      } catch (err: unknown) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Error verificando el pago");
      }
    };

    verify();
  }, [searchParams]);

  const planNames: Record<string, string> = {
    starter: "Starter", pro: "Pro", enterprise: "Enterprise", partner: "Partner",
  };
  const planIcons: Record<string, React.ElementType> = {
    starter: Zap, pro: Rocket, enterprise: Crown, partner: Users,
  };
  const planColors: Record<string, string> = {
    starter: "from-blue-500 to-cyan-500",
    pro: "from-violet-500 to-purple-600",
    enterprise: "from-amber-500 to-orange-600",
    partner: "from-orange-500 to-amber-600",
  };
  const cycleNames: Record<string, string> = {
    monthly: "Mensual", quarterly: "Trimestral", semiannual: "Semestral", annual: "Anual", biennial: "Bienal",
  };

  const PlanIcon = result?.plan_id ? planIcons[result.plan_id] || Crown : Crown;

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center p-4 relative overflow-hidden">
      {showConfetti && <ConfettiCanvas />}

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        {status === "success" && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.06] rounded-full blur-[150px] animate-pulse" />
        )}
      </div>

      <div className="max-w-lg w-full relative z-10">
        {status === "loading" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Verificando pago...</h2>
            <p className="text-zinc-400 text-sm">Conectando con Stripe para confirmar tu suscripción</p>
            <div className="mt-6 flex justify-center gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}

        {status === "success" && result && (
          <div className="text-center">
            {/* Success Icon */}
            <div className={cn(
              "w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/30 to-green-500/20 flex items-center justify-center mx-auto mb-6 transition-all duration-700",
              animated ? "scale-100 opacity-100" : "scale-50 opacity-0"
            )}>
              <div className="w-16 h-16 rounded-full bg-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
            </div>

            <div className={cn("transition-all duration-500 delay-200", animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <PartyPopper className="w-5 h-5 text-amber-400" />
                <h2 className="text-2xl font-black text-white">¡Pago Confirmado!</h2>
                <PartyPopper className="w-5 h-5 text-amber-400 scale-x-[-1]" />
              </div>
              <p className="text-zinc-400 mb-8">Tu suscripción ha sido activada correctamente</p>
            </div>

            {/* Plan Card */}
            <div className={cn(
              "bg-[#0A0A0D] border border-white/[0.06] rounded-2xl p-6 mb-6 text-left transition-all duration-500 delay-300",
              animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
              <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/[0.04]">
                <div className={cn("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg", planColors[result.plan_id || "pro"])}>
                  <PlanIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Plan {planNames[result.plan_id || ""] || result.plan_id}</h3>
                  <p className="text-xs text-zinc-500">{cycleNames[result.billing_cycle || ""] || result.billing_cycle}</p>
                </div>
                <div className="ml-auto">
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Activo
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-600 mb-0.5">Plan</p>
                  <p className="text-sm font-bold text-white">{planNames[result.plan_id || ""] || result.plan_id}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-600 mb-0.5">Ciclo</p>
                  <p className="text-sm font-bold text-white">{cycleNames[result.billing_cycle || ""] || result.billing_cycle}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-600 mb-0.5">Estado</p>
                  <p className="text-sm font-bold text-emerald-400">Activo</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-zinc-600 mb-0.5">ID Suscripción</p>
                  <p className="text-sm font-bold text-white font-mono">#{result.subscription_id || "—"}</p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className={cn(
              "bg-[#0A0A0D] border border-white/[0.06] rounded-2xl p-5 mb-6 transition-all duration-500 delay-500",
              animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
              <h4 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Próximos pasos
              </h4>
              <div className="space-y-2">
                {[
                  { icon: BarChart3, text: "Explora tu Dashboard con métricas en tiempo real" },
                  { icon: Users, text: "Configura tu CRM y añade tus primeros contactos" },
                  { icon: Bot, text: "Activa los Chatbots IA para automatizar tu negocio" },
                  { icon: Shield, text: "Revisa la configuración de seguridad de tu cuenta" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                      <step.icon className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <span className="text-xs text-zinc-400">{step.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => navigate("/saas/dashboard")}
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-violet-500/25 text-sm"
            >
              Ir al Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Error en el Pago</h2>
            <p className="text-zinc-400 mb-6 text-sm">{error}</p>
            <div className="bg-[#0A0A0D] border border-red-500/10 rounded-2xl p-5 mb-6">
              <p className="text-xs text-zinc-500 mb-3">¿Qué puedes hacer?</p>
              <div className="space-y-2 text-left">
                {[
                  "Verifica que tu tarjeta tenga fondos suficientes",
                  "Comprueba que los datos de la tarjeta son correctos",
                  "Intenta con otro método de pago",
                  "Contacta con soporte si el problema persiste",
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-[9px] font-bold text-red-400 shrink-0">{i + 1}</div>
                    <span className="text-[11px] text-zinc-400">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/saas/pricing")}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11"
              >
                Volver a Planes
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white h-11"
              >
                Reintentar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}