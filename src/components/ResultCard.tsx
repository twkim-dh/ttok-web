'use client';

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import SyncRateCircle from './SyncRateCircle';
import ResultBadge from './ResultBadge';
import CategoryBar from './CategoryBar';

interface ResultCardProps {
  syncRate: number;
  badge: string;
  categoryScores: Record<string, number>;
  questionSetTitle: string;
}

export default function ResultCard({
  syncRate,
  badge,
  categoryScores,
  questionSetTitle,
}: ResultCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleCapture = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `ttok-result-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to capture image:', err);
    }
  }, []);

  const categories = Object.entries(categoryScores);

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* Capturable card area */}
      <div
        ref={cardRef}
        className="w-full max-w-[360px] rounded-3xl overflow-hidden shadow-xl"
        style={{
          background: 'linear-gradient(180deg, #FFF0F0 0%, #FFFFFF 40%, #F0FFFE 100%)',
        }}
      >
        <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-5">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <span
              className="text-3xl font-extrabold"
              style={{ color: '#FF6B6B' }}
            >
              똑
            </span>
            <span className="text-xl">🎯</span>
          </div>

          {/* Question set title */}
          <p className="text-sm text-gray-400 font-medium">{questionSetTitle}</p>

          {/* Sync Rate Circle */}
          <SyncRateCircle rate={syncRate} animate={false} />

          {/* Badge */}
          <ResultBadge syncRate={syncRate} />

          {/* Category scores */}
          {categories.length > 0 && (
            <div className="w-full flex flex-col gap-3 mt-2">
              {categories.map(([name, score], index) => (
                <CategoryBar
                  key={name}
                  categoryName={name}
                  matchRate={score}
                  delay={index * 0.1}
                />
              ))}
            </div>
          )}

          {/* Watermark */}
          <p className="text-xs text-gray-300 mt-4">ttok.kr</p>
        </div>
      </div>

      {/* Capture button (outside the card so it's not in the image) */}
      <motion.button
        className="w-full max-w-[360px] min-h-[52px] rounded-xl font-semibold text-base flex items-center justify-center gap-2 px-4 text-white"
        style={{ backgroundColor: '#FF6B6B' }}
        whileTap={{ scale: 0.97 }}
        onClick={handleCapture}
        type="button"
      >
        <span className="text-xl">📸</span>
        이미지 저장
      </motion.button>
    </div>
  );
}
