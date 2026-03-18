'use client';

import { motion } from 'framer-motion';

interface CategoryBarProps {
  categoryName: string;
  matchRate: number;
  delay?: number;
}

function getColor(rate: number): string {
  if (rate <= 30) return '#EF4444';
  if (rate <= 50) return '#F97316';
  if (rate <= 70) return '#EAB308';
  if (rate <= 85) return '#EC4899';
  return '#8B5CF6';
}

export default function CategoryBar({ categoryName, matchRate, delay = 0 }: CategoryBarProps) {
  const color = getColor(matchRate);

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{categoryName}</span>
        <span className="text-sm font-bold" style={{ color }}>
          {matchRate}%
        </span>
      </div>
      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${matchRate}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}
