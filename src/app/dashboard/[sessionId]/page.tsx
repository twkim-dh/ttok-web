'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import { getSession, getAllResults } from '@/lib/firestore-service';
import { getQuestionSetById } from '@/data/questions';
import { getBadge } from '@/lib/result-calculator';
import type { Session, Result } from '@/types';

interface DashboardPageProps {
  params: Promise<{ sessionId: string }>;
}

function getRateColor(rate: number): string {
  if (rate <= 30) return '#EF4444';
  if (rate <= 50) return '#F97316';
  if (rate <= 70) return '#EAB308';
  if (rate <= 85) return '#FF6B6B';
  return '#8B5CF6';
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const s = await getSession(sessionId);
      setSession(s);
      if (s) {
        const r = await getAllResults(sessionId);
        // 싱크로율 높은 순 정렬
        r.sort((a, b) => b.syncRate - a.syncRate);
        setResults(r);
      }
      setLoading(false);
    }
    load();

    // 5초마다 새 응답자 확인
    const interval = setInterval(async () => {
      const r = await getAllResults(sessionId);
      r.sort((a, b) => b.syncRate - a.syncRate);
      setResults(r);
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          className="w-8 h-8 border-4 rounded-full"
          style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 gap-4">
        <p className="text-5xl">😢</p>
        <p className="text-lg font-semibold text-gray-600">세션을 찾을 수 없어요</p>
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

  const questionSet = getQuestionSetById(session.questionSetId);
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/s/${session.shareCode}`
    : '';

  const avgRate = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.syncRate, 0) / results.length)
    : 0;

  return (
    <div className="flex flex-col items-center px-5 pb-12 pt-6 min-h-screen">
      <Logo />

      <motion.h1
        className="text-xl font-bold text-gray-900 text-center mt-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        내 취향 대시보드
      </motion.h1>

      {questionSet && (
        <motion.p
          className="text-sm text-gray-400 mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {questionSet.emoji} {questionSet.title}
        </motion.p>
      )}

      {/* Stats */}
      <motion.div
        className="mt-6 w-full grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <p className="text-3xl font-bold" style={{ color: '#FF6B6B' }}>{results.length}</p>
          <p className="text-xs text-gray-400 mt-1">참여한 친구</p>
        </div>
        <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
          <p className="text-3xl font-bold" style={{ color: '#4ECDC4' }}>{avgRate}%</p>
          <p className="text-xs text-gray-400 mt-1">평균 싱크로율</p>
        </div>
      </motion.div>

      {/* Share Link */}
      <motion.div
        className="mt-4 w-full bg-white rounded-2xl p-4 shadow-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="text-xs text-gray-400 mb-2">더 많은 친구에게 공유하기</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="flex-1 px-3 py-2 rounded-xl bg-gray-50 text-sm text-gray-600 outline-none"
          />
          <button
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: '#FF6B6B' }}
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              alert('링크가 복사됐어요!');
            }}
          >
            복사
          </button>
        </div>
      </motion.div>

      {/* Ranking */}
      <motion.div
        className="mt-6 w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-bold text-gray-800 mb-3">
          🏆 싱크로율 랭킹
        </h2>

        {results.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <p className="text-4xl mb-3">🕐</p>
            <p className="text-gray-500 font-medium">아직 참여한 친구가 없어요</p>
            <p className="text-gray-300 text-sm mt-1">링크를 공유해보세요!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map((result, index) => {
              const badge = getBadge(result.syncRate);
              const isTop = index === 0;
              return (
                <motion.div
                  key={result.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 cursor-pointer
                    ${isTop ? 'ring-2 ring-[#FF6B6B] ring-opacity-50' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => router.push(`/result/${sessionId}?rid=${result.respondentId}`)}
                >
                  {/* Rank */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      backgroundColor: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#F3F4F6',
                      color: index < 3 ? 'white' : '#9CA3AF',
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Name + Badge */}
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{result.respondentName || '익명'}</p>
                    <p className="text-xs text-gray-400">{badge.emoji} {badge.label}</p>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: getRateColor(result.syncRate) }}>
                      {result.syncRate}%
                    </p>
                  </div>

                  {/* Arrow */}
                  <span className="text-gray-300">›</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Home button */}
      <motion.button
        className="mt-8 px-6 py-3 rounded-xl text-gray-400 text-sm"
        whileTap={{ scale: 0.95 }}
        onClick={() => router.push('/')}
      >
        🏠 홈으로
      </motion.button>
    </div>
  );
}
