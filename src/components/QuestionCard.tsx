'use client';

import { motion } from 'framer-motion';
import type { QuestionSet } from '@/types';

interface QuestionCardProps {
  questionSet: QuestionSet;
  onClick: () => void;
}

function formatCount(count: number): string {
  return count.toLocaleString('ko-KR');
}

export default function QuestionCard({ questionSet, onClick }: QuestionCardProps) {
  const { emoji, title, subtitle, playCount } = questionSet;

  return (
    <motion.div
      className="w-full rounded-2xl bg-white shadow-md p-6 cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      onClick={onClick}
    >
      <div className="text-5xl text-center mb-4">{emoji}</div>
      <h3 className="text-lg font-bold text-gray-900 text-center">{title}</h3>
      <p className="text-sm text-gray-400 text-center mt-1">{subtitle}</p>
      <p className="text-xs text-gray-300 text-center mt-2">
        {formatCount(playCount)}명 참여
      </p>
      <button
        className="mt-4 w-full py-3 rounded-xl text-white font-semibold text-base min-h-[44px]"
        style={{ backgroundColor: '#FF6B6B' }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        시작하기 →
      </button>
    </motion.div>
  );
}
