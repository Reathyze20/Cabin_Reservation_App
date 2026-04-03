const fs = require('fs');
const newContent = \import { Plus, ChevronRight, Moon, MessageCircle } from "lucide-react";
import type { Reservation } from "@/api/reservations";
import { motion } from "framer-motion";

const MONTH_NAMES = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];

function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function hexToRgba(hex: string | undefined, alpha = 1): string {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) return \\\gba(128,128,128,\\\\)\\\;
  let c = hex.substring(1).split("");
  if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  const n = parseInt(c.join(""), 16);
  return \\\gba(\\\\, \\\\, \\\\, \\\\)\\\;
}

interface Props {
  reservations: Reservation[];
  onShowDetail: (r: Reservation) => void;
  onNewReservation: () => void;
}

export function ReservationList({
  reservations,
  onShowDetail,
  onNewReservation,
}: Props) {
  const sorted = [...reservations].sort(
    (a, b) => new Date(a.from).getTime() - new Date(b.from).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100">
        <div className="text-5xl mb-4">🏡</div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Chata je volná!</h3>
        <p className="text-sm text-slate-500 mb-6">V tomto období nejsou naplánovány žádné pobyty.</p>
        <button 
          onClick={onNewReservation}
          className="btn-primary shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={18} className="mr-1" /> Vytvořit rezervaci
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((r, i) => {
        const uColor = r.userColor || "#94a3b8";
        const init = r.username.charAt(0).toUpperCase();
        const d1 = new Date(r.from + "T00:00:00");
        const d2 = new Date(r.to + "T00:00:00");
        
        const nights = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));

        const dateLabel =
          d1.getMonth() === d2.getMonth()
            ? \\\\\\\. – \\\\. \\\\\\\
            : \\\\\\\. \\\\ – \\\\. \\\\\\\;

        let badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200";
        let statusLabel = "Potvrzeno";
        if (r.status === "backup") {
          badgeStyle = "bg-amber-100 text-amber-800 border-amber-200";
          statusLabel = "Záložní";
        } else if (r.status === "soft") {
          badgeStyle = "bg-slate-100 text-slate-600 border-slate-200";
          statusLabel = "Předběžná";
        }

        const isPast = d2 < new Date();

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            key={r.id} 
            className={\\\group relative overflow-hidden bg-white/95 backdrop-blur-xl shadow-sm hover:shadow-md transition-all rounded-2xl border border-white/60 cursor-pointer \\\\\\\}
            onClick={() => onShowDetail(r)}
          >
            {/* Color accent stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-80" style={{ backgroundColor: uColor }} />
            
            <div className="p-4 pl-5 flex items-center gap-4">
              {/* Avatar */}
              <div 
                className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-2xl shadow-sm border border-white/50"
                style={{ backgroundColor: hexToRgba(uColor, 0.2) }}
              >
                {r.userAnimalIcon || <span className="text-lg font-bold text-slate-700">{init}</span>}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-slate-800 truncate pr-2">{r.username}</strong>
                  <span className={\\\	ext-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border \\\\\\\}>
                    {statusLabel}
                  </span>
                </div>

                <div className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                  <span>{dateLabel}</span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center text-xs text-slate-500"><Moon size={12} className="mr-0.5" /> {nights} nocí</span>
                </div>

                {r.purpose && (
                  <div className="text-sm text-slate-500 mt-1 truncate">
                    {r.status === 'soft' ? <span className="italic">{r.purpose}</span> : r.purpose}
                  </div>
                )}
                
                {r.handoverNote && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                    <MessageCircle size={12} />
                    <span>Vzkaz pro dalšího</span>
                  </div>
                )}
              </div>

              {/* Chevron */}
              <div className="text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0">
                <ChevronRight size={20} />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
\
fs.writeFileSync('c:/Users/reath/Projects/CabinReservationProject/frontend-v2/src/features/reservations/ui/ReservationList.tsx', newContent);