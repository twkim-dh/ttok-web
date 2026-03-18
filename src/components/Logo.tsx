'use client';

import { motion } from 'framer-motion';

export default function Logo() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-6"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, duration: 0.6 }}
    >
      <div className="flex items-center gap-1">
        <span
          className="text-5xl font-extrabold"
          style={{ color: '#FF6B6B' }}
        >
          똑
        </span>
        <span className="text-3xl" role="img" aria-label="target">
          🎯
        </span>
      </div>
      <motion.p
        className="mt-2 text-sm text-gray-400 tracking-wide"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        취향이 통하는 사이
      </motion.p>
    </motion.div>
  );
}
