'use client';

import { motion } from 'framer-motion';

interface ResultBadgeProps {
  syncRate: number;
}

interface BadgeInfo {
  emoji: string;
  label: string;
  bgColor: string;
  textColor: string;
}

function getBadgeInfo(rate: number): BadgeInfo {
  if (rate <= 30) {
    return { emoji: '🔥', label: '완전 반대 매력', bgColor: '#FEE2E2', textColor: '#DC2626' };
  }
  if (rate <= 50) {
    return { emoji: '🤔', label: '의외로 다른 조합', bgColor: '#FFEDD5', textColor: '#EA580C' };
  }
  if (rate <= 70) {
    return { emoji: '😊', label: '은근 잘 통함', bgColor: '#FEF9C3', textColor: '#CA8A04' };
  }
  if (rate <= 85) {
    return { emoji: '💕', label: '찰떡궁합', bgColor: '#FCE7F3', textColor: '#DB2777' };
  }
  return { emoji: '🎯', label: '거의 한 사람', bgColor: '#EDE9FE', textColor: '#7C3AED' };
}

export default function ResultBadge({ syncRate }: ResultBadgeProps) {
  const { emoji, label, bgColor, textColor } = getBadgeInfo(syncRate);

  return (
    <motion.div
      className="inline-flex flex-col items-center gap-2 px-6 py-4 rounded-2xl"
      style={{ backgroundColor: bgColor }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 12,
        delay: 0.3,
      }}
    >
      <motion.span
        className="text-5xl"
        animate={{ y: [0, -6, 0] }}
        transition={{ delay: 0.8, duration: 0.5, ease: 'easeOut' }}
      >
        {emoji}
      </motion.span>
      <span
        className="text-base font-bold"
        style={{ color: textColor }}
      >
        {label}
      </span>
    </motion.div>
  );
}
