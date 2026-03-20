'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';
import ProgressBar from '@/components/ProgressBar';
import OptionButton from '@/components/OptionButton';
import { getQuestionsBySetId, getQuestionSetById } from '@/data/questions';
import {
  getSessionByShareCode,
  saveAnswers,
  getAnswers,
  saveResult,
} from '@/lib/firestore-service';
import { calculateSyncRate } from '@/lib/result-calculator';
import type { Session, Question } from '@/types';

interface RespondentPageProps {
  params: Promise<{ shareCode: string }>;
}

type Stage = 'intro' | 'nickname' | 'playing' | 'calculating';

export default function RespondentPage({ params }: RespondentPageProps) {
  const { shareCode } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stage, setStage] = useState<Stage>('intro');
  const [nickname, setNickname] = useState('');
  const [respondentId] = useState(() => nanoid(8));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<'A' | 'B'>>([]);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const s = await getSessionByShareCode(shareCode);
        if (!s) {
          setError('테스트를 찾을 수 없어요');
          setLoading(false);
          return;
        }
        setSession(s);
        const qs = getQuestionsBySetId(s.questionSetId);
        setQuestions(qs);
      } catch (err) {
        console.error('Failed to load session:', err);
        setError('세션을 불러올 수 없어요');
      }
      setLoading(false);
    }
    loadSession();
  }, [shareCode]);

  const questionSet = session ? getQuestionSetById(session.questionSetId) : undefined;

  const handleStart = useCallback(() => {
    setStage('nickname');
  }, []);

  const handleNicknameSubmit = useCallback(() => {
    if (nickname.trim().length === 0) return;
    setStage('playing');
  }, [nickname]);

  const handleSelect = useCallback(
    async (option: 'A' | 'B') => {
      if (selectedOption || !session) return;
      setSelectedOption(option);

      const newAnswers = [...answers, option];
      setAnswers(newAnswers);

      if (currentIndex < questions.length - 1) {
        setTimeout(() => {
          setSelectedOption(null);
          setCurrentIndex((prev) => prev + 1);
        }, 500);
      } else {
        // Last question: save immediately without setTimeout
        setStage('calculating');
        try {
          const answerPayloads = questions.map((q, idx) => ({
            questionId: q.id,
            selectedOption: newAnswers[idx] as 'A' | 'B',
          }));
          await saveAnswers(session.id, 'respondent', answerPayloads, respondentId);
          console.log('[Respondent] Answers saved for session:', session.id);

          const allAnswers = await getAnswers(session.id, respondentId);
          console.log('[Respondent] Got answers - creator:', allAnswers.creator.length, 'respondent:', allAnswers.respondent.length);

          const result = calculateSyncRate(
            allAnswers.creator,
            allAnswers.respondent,
            questions
          );

          await saveResult(session.id, {
            respondentId,
            respondentName: nickname.trim(),
            syncRate: result.syncRate,
            totalQuestions: result.totalQuestions,
            matchedCount: result.matchedCount,
            categoryScores: result.categoryScores,
            summaryText: result.summaryText,
          });

          router.push(`/result/${session.id}?rid=${respondentId}`);
        } catch (err) {
          console.error('Failed to save respondent data:', err);
          alert('결과 저장에 실패했습니다. 다시 시도해주세요.');
          setStage('playing');
        }
      }
    },
    [selectedOption, session, answers, currentIndex, questions, router, respondentId, nickname]
  );

  useEffect(() => {
    if (stage !== 'playing') return;
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [stage]);

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

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 gap-4">
        <p className="text-5xl">😢</p>
        <p className="text-lg font-semibold text-gray-600">{error || '세션을 찾을 수 없어요'}</p>
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

  // Intro stage
  if (stage === 'intro') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 py-8">
        <motion.div
          className="text-6xl mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5 }}
        >
          🎯
        </motion.div>
        <motion.h1
          className="text-2xl font-bold text-gray-900 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          상대가 만든 취향 테스트예요
        </motion.h1>
        <motion.p
          className="text-base text-gray-500 text-center mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          몇 %나 맞을지 확인해보세요
        </motion.p>

        {questionSet && (
          <motion.div
            className="mt-8 bg-white rounded-2xl px-8 py-6 shadow-sm text-center"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <span className="text-5xl">{questionSet.emoji}</span>
            <p className="text-lg font-bold text-gray-800 mt-3">{questionSet.title}</p>
            <p className="text-sm text-gray-400 mt-1">{questionSet.subtitle}</p>
          </motion.div>
        )}

        <motion.button
          className="mt-10 w-full max-w-[320px] py-4 rounded-2xl text-white text-lg font-bold shadow-lg"
          style={{ backgroundColor: '#FF6B6B' }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={handleStart}
        >
          시작하기
        </motion.button>
      </div>
    );
  }

  // Nickname stage
  if (stage === 'nickname') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 py-8">
        <motion.div
          className="text-5xl mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' as const, stiffness: 300, damping: 20 }}
        >
          ✏️
        </motion.div>
        <motion.h1
          className="text-xl font-bold text-gray-900 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          이름을 알려주세요
        </motion.h1>
        <motion.p
          className="text-sm text-gray-400 text-center mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          결과에서 이 이름으로 표시돼요
        </motion.p>

        <motion.div
          className="mt-8 w-full max-w-[320px]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNicknameSubmit()}
            placeholder="닉네임 입력 (예: 민수)"
            maxLength={10}
            className="w-full px-5 py-4 rounded-2xl border-2 border-gray-200 text-center text-lg font-semibold
                       focus:border-[#FF6B6B] focus:outline-none transition-colors"
            autoFocus
          />
          <button
            className="mt-4 w-full py-4 rounded-2xl text-white text-lg font-bold shadow-lg
                       disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            style={{ backgroundColor: '#FF6B6B' }}
            onClick={handleNicknameSubmit}
            disabled={nickname.trim().length === 0}
          >
            다음 →
          </button>
        </motion.div>
      </div>
    );
  }

  // Calculating stage
  if (stage === 'calculating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5">
        <motion.div
          className="w-12 h-12 border-4 rounded-full"
          style={{ borderColor: '#4ECDC4', borderTopColor: 'transparent' }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        />
        <motion.p
          className="mt-4 text-base font-medium text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          결과 계산 중...
        </motion.p>
      </div>
    );
  }

  // Playing stage
  const currentQuestion = questions[currentIndex];

  return (
    <div className="flex flex-col min-h-screen px-5 pt-6 pb-8">
      <div className="mb-2">
        {questionSet && (
          <p className="text-sm text-gray-400 text-center mb-3">
            {questionSet.emoji} {questionSet.title}
          </p>
        )}
        <ProgressBar current={currentIndex + 1} total={questions.length} />
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
            className="flex flex-col items-center gap-8"
          >
            <h2 className="text-xl font-bold text-gray-900 text-center leading-relaxed px-2">
              {currentQuestion.text}
            </h2>

            <div className="w-full flex flex-col gap-4">
              <OptionButton
                label={currentQuestion.optionA}
                option="A"
                selected={selectedOption === 'A'}
                onClick={() => handleSelect('A')}
              />
              <OptionButton
                label={currentQuestion.optionB}
                option="B"
                selected={selectedOption === 'B'}
                onClick={() => handleSelect('B')}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
