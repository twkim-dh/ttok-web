'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ResultCard from '@/components/ResultCard';
import { getResult } from '@/lib/firestore-service';
import { getQuestionSetById } from '@/data/questions';
import { getBadge } from '@/lib/result-calculator';
import type { Result } from '@/types';

function getSessionFromStorage(sessionId: string): { questionSetId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`session:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface CardPageProps {
  params: Promise<{ sessionId: string }>;
}

export default function CardPage({ params }: CardPageProps) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [questionSetTitle, setQuestionSetTitle] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const r = await getResult(sessionId);
        setResult(r);

        if (r) {
          const session = getSessionFromStorage(sessionId);
          const setId = session?.questionSetId || '';
          const qSet = getQuestionSetById(setId);
          setQuestionSetTitle(qSet ? `${qSet.emoji} ${qSet.title}` : '취향 테스트');
        }
      } catch (err) {
        console.error('Failed to load result:', err);
      }
      setLoading(false);
    }
    loadData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          className="w-10 h-10 border-4 rounded-full"
          style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 gap-4">
        <p className="text-lg font-semibold text-gray-600">결과를 찾을 수 없어요</p>
        <button
          className="px-6 py-3 rounded-xl text-white font-semibold"
          style={{ backgroundColor: '#FF6B6B' }}
          onClick={() => router.push('/')}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const badge = getBadge(result.syncRate);

  return (
    <div className="flex flex-col items-center min-h-screen px-5 py-8">
      {/* Page title */}
      <motion.h1
        className="text-lg font-bold text-gray-800 mb-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        결과 카드
      </motion.h1>

      {/* ResultCard component */}
      <motion.div
        className="w-full"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <ResultCard
          syncRate={result.syncRate}
          badge={badge.emoji + ' ' + badge.label}
          categoryScores={result.categoryScores}
          questionSetTitle={questionSetTitle}
        />
      </motion.div>

      {/* Back link */}
      <motion.button
        className="mt-8 text-sm font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => router.push(`/result/${sessionId}`)}
      >
        ← 결과로 돌아가기
      </motion.button>
    </div>
  );
}
