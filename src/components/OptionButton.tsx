'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface OptionButtonProps {
  label: string;
  option: 'A' | 'B';
  selected: boolean;
  onClick: () => void;
}

const COLORS = {
  A: '#FF6B6B',
  B: '#4ECDC4',
} as const;

export default function OptionButton({ label, option, selected, onClick }: OptionButtonProps) {
  const color = COLORS[option];

  return (
    <motion.button
      className="w-full min-h-[80px] rounded-2xl px-5 py-4 text-left font-semibold text-base relative overflow-hidden border-2 transition-colors duration-200"
      style={{
        backgroundColor: selected ? color : '#FFFFFF',
        borderColor: color,
        color: selected ? '#FFFFFF' : color,
      }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2"
            style={{
              backgroundColor: selected ? '#FFFFFF' : 'transparent',
              borderColor: selected ? '#FFFFFF' : color,
              color: selected ? color : color,
            }}
          >
            {option}
          </span>
          <span className="leading-snug">{label}</span>
        </div>
        <AnimatePresence>
          {selected && (
            <motion.span
              className="text-white text-xl shrink-0"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              ✓
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
