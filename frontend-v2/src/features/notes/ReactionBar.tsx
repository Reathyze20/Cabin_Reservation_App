import { motion, AnimatePresence } from "framer-motion";
import type { NoteReaction } from "@/api/notes";

interface Props {
  reactions: NoteReaction[];
  onToggle: (emoji: string) => void;
}

export function ReactionBar({ reactions, onToggle }: Props) {
  if (!reactions || reactions.length === 0) return null;

  return (
    <div className="reaction-bar">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.button
            key={r.emoji}
            className={`reaction-badge${r.reacted ? " reaction-badge-mine" : ""}`}
            onClick={() => onToggle(r.emoji)}
            title={r.reacted ? "Odebrat reakci" : "Přidat reakci"}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <span className="reaction-emoji">{r.emoji}</span>
            <span className="reaction-count">{r.count}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
