'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ShareButtons from '@/components/ShareButtons';
import { initKakao, shareTest } from '@/lib/kakao';
import { getQuestionSetById } from '@/data/questions';
import type { Session } from '@/types';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://ttok.app';
}

function getSessionFromStorage(sessionId: string): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`session:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getResultFromStorage(sessionId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`result:${sessionId}`);
    return raw !== null;
  } catch {
    return false;
  }
}

function getRespondentAnswersFromStorage(sessionId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(`answers:${sessionId}:respondent`);
    return raw !== null;
  } catch {
    return false;
  }
}

interface SharePageProps {
  params: Promise<{ sessionId: string }>;
}

export default function SharePage({ params }: SharePageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initKakao();
  }, []);

  useEffect(() => {
    const s = getSessionFromStorage(sessionId);
    setSession(s);
    setLoading(false);
  }, [sessionId]);

  // Poll for respondent completion
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const hasResult = getResultFromStorage(sessionId);
      const hasRespondent = getRespondentAnswersFromStorage(sessionId);
      if (hasResult || hasRespondent) {
        clearInterval(interval);
        router.push(`/result/${sessionId}`);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [session, sessionId, router]);

  const shareUrl = session
    ? `${getBaseUrl()}/s/${session.shareCode}`
    : '';

  const questionSet = session
    ? getQuestionSetById(session.questionSetId)
    : undefined;

  const handleKakaoShare = useCallback(() => {
    if (session && questionSet) {
      shareTest(questionSet, session.shareCode);
    }
  }, [session, questionSet]);

  const handleCopyLink = useCallback(() => {
    // Handled internally by ShareButtons
  }, []);

  const handleSmsShare = useCallback(() => {
    // Handled internally by ShareButtons
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 gap-4">
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-5 py-8">
      {/* Success animation */}
      <motion.div
        className="text-6xl mb-4"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.3, 1] }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        🎉
      </motion.div>

      <motion.h1
        className="text-2xl font-bold text-gray-900 text-center"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        답변 완료!
      </motion.h1>

      <motion.p
        className="text-base text-gray-500 text-center mt-3 leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        이제 상대방에게 보내보세요
      </motion.p>

      <motion.p
        className="text-sm text-gray-400 text-center mt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        상대가 답하면 바로 비교 결과가 나와요
      </motion.p>

      {/* Question set info */}
      {questionSet && (
        <motion.div
          className="mt-6 bg-white rounded-2xl px-6 py-4 shadow-sm text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <span className="text-3xl">{questionSet.emoji}</span>
          <p className="text-sm font-semibold text-gray-700 mt-1">{questionSet.title}</p>
        </motion.div>
      )}

      {/* Share Buttons */}
      <motion.div
        className="w-full mt-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <ShareButtons
          onKakaoShare={handleKakaoShare}
          onCopyLink={handleCopyLink}
          onSmsShare={handleSmsShare}
          shareUrl={shareUrl}
        />
      </motion.div>

      {/* Waiting message */}
      <motion.div
        className="mt-10 flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
      >
        <motion.div
          className="w-6 h-6 border-3 rounded-full"
          style={{ borderColor: '#4ECDC4', borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
        <p className="text-sm text-gray-400 text-center">
          결과는 상대가 답변하면 여기서 바로 볼 수 있어요
        </p>
      </motion.div>

      {/* Dashboard link */}
      <motion.button
        className="mt-6 w-full py-4 rounded-2xl font-bold text-base text-white"
        style={{ backgroundColor: '#4ECDC4' }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        onClick={() => router.push(`/dashboard/${sessionId}`)}
      >
        📊 대시보드에서 전체 결과 보기
      </motion.button>
    </div>
  );
}
