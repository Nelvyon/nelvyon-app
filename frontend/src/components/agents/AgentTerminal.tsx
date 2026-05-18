import { motion } from "framer-motion";
import { Terminal as TerminalIcon } from "lucide-react";
import type { AgentLog } from "@/lib/agents-data";

interface AgentTerminalProps {
  logs: AgentLog[];
  agentName: string;
  color: string;
}

const levelColors = {
  info: "text-blue-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-red-400",
};

const levelIcons = {
  info: "ℹ",
  success: "✓",
  warning: "⚠",
  error: "✗",
};

export function AgentTerminal({ logs, agentName, color }: AgentTerminalProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0A0B0F]">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#12131A] px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="flex items-center gap-1.5 ml-2">
          <TerminalIcon className="h-3 w-3" style={{ color }} />
          <span className="text-[11px] font-mono text-slate-400">{agentName.toLowerCase()}@nelvyon ~ logs</span>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-4 font-mono text-xs leading-relaxed max-h-[300px] overflow-y-auto">
        {logs.map((log, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex gap-2 mb-1.5"
          >
            <span className="text-slate-600 select-none">{log.timestamp}</span>
            <span className={`select-none ${levelColors[log.level]}`}>{levelIcons[log.level]}</span>
            <span className={levelColors[log.level]}>{log.message}</span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="mt-2 flex items-center gap-1"
        >
          <span className="text-slate-600">$</span>
          <span className="h-3.5 w-1.5 bg-slate-500" />
        </motion.div>
      </div>
    </div>
  );
}