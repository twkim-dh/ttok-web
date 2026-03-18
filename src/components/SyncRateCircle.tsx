'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SyncRateCircleProps {
  rate: number;
  animate: boolean;
}

function getColor(rate: number): string {
  if (rate <= 30) return '#EF4444';
  if (rate <= 50) return '#F97316';
  if (rate <= 70) return '#EAB308';
  if (rate <= 85) return '#EC4899';
  return '#8B5CF6';
}

function getBadge(rate: number): string {
  if (rate <= 30) return '🔥';
  if (rate <= 50) return '🤔';
  if (rate <= 70) return '😊';
  if (rate <= 85) return '💕';
  return '🎯';
}

export default function SyncRateCircle({ rate, animate }: SyncRateCircleProps) {
  const [displayRate, setDisplayRate] = useState(animate ? 0 : rate);
  const color = getColor(rate);
  const badge = getBadge(rate);

  const radius = 80;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = animate ? (displayRate / 100) * circumference : (rate / 100) * circumference;
  const offset = circumference - progress;

  useEffect(() => {
    if (!animate) {
      setDisplayRate(rate);
      return;
    }
    setDisplayRate(0);
    const duration = 1500;
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const fraction = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - fraction, 3);
      setDisplayRate(Math.round(eased * rate));
      if (fraction >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [rate, animate]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <svg width={200} height={200} viewBox="0 0 200 200">
        {/* Background circle */}
        <circle
          cx={100}
          cy={100}
          r={radius}
          fill="none"
          stroke="#F3F4F6"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <motion.circle
          cx={100}
          cy={100}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 100 100)"
          initial={animate ? { strokeDashoffset: circumference } : undefined}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        {/* Center text */}
        <text
          x={100}
          y={92}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={48}
          fontWeight="bold"
          fill={color}
        >
          {displayRate}
        </text>
        <text
          x={100}
          y={122}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={18}
          fill={color}
          fontWeight="600"
        >
          %
        </text>
      </svg>
      <motion.div
        className="text-4xl mt-1"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 400, damping: 15 }}
      >
        {badge}
      </motion.div>
    </motion.div>
  );
}
