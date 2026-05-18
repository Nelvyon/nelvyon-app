import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bot,
  LayoutDashboard,
  ArrowLeft,
  Zap,
} from "lucide-react";
import { agents } from "@/lib/agents-data";

interface AgentsLayoutProps {
  children: ReactNode;
}

export function AgentsLayout({ children }: AgentsLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#0A0B0F] text-white">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-white/[0.06] bg-[#0A0B0F]">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold">NELVYON Agents</h1>
            <p className="text-[10px] text-slate-500">Panel Interno</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <Link
            to="/agents"
            className={`mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              location.pathname === "/agents"
                ? "bg-white/[0.06] text-white"
                : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Panel General
          </Link>

          <div className="mb-2 mt-4 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Agentes
          </div>

          {agents.map((agent) => {
            const Icon = agent.icon;
            const isActive = location.pathname === `/agents/${agent.id}`;
            return (
              <Link
                key={agent.id}
                to={`/agents/${agent.id}`}
                className={`mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-white/[0.06] text-white"
                    : "text-slate-500 hover:bg-white/[0.03] hover:text-slate-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: isActive ? agent.color : undefined }} />
                <span>{agent.name}</span>
                <div className={`ml-auto h-1.5 w-1.5 rounded-full ${agent.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-3 py-3">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 transition-colors hover:bg-white/[0.03] hover:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al Dashboard
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="p-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}