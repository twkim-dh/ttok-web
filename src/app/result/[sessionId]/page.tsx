'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import SyncRateCircle from '@/components/SyncRateCircle';
import ResultBadge from '@/components/ResultBadge';
import CategoryBar from '@/components/CategoryBar';
import { getResult, getAnswers, getSession } from '@/lib/firestore-service';
import { getQuestionsBySetId, getQuestionSetById } from '@/data/questions';
import { initKakao, shareResult } from '@/lib/kakao';
import { getBadge, getInterpretation } from '@/lib/result-calculator';
import type { Result, Question, Answer } from '@/types';

const categoryLabels: Record<string, string> = {
  friendship: '우정',
  romance: '연애',
  flirting: '썸',
  food: '음식',
  balance: '밸런스',
};

function getSessionFromStorage(sessionId: string): { questionSetId: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`session:${sessionId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface ResultPageProps {
  params: Promise<{ sessionId: string }>;
}

interface MatchDetail {
  questionText: string;
  choice: string;
}

export default function ResultPage({ params }: ResultPageProps) {
  const { sessionId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const respondentId = searchParams.get('rid') || undefined;

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [perfectMatches, setPerfectMatches] = useState<MatchDetail[]>([]);
  const [oppositeMatches, setOppositeMatches] = useState<MatchDetail[]>([]);
  const [funSummary, setFunSummary] = useState('');
  const [questionSetTitle, setQuestionSetTitle] = useState('');

  useEffect(() => {
    initKakao();
  }, []);

  useEffect(() => {
    async function loadResult() {
      try {
        // Load result
        const r = await getResult(sessionId, respondentId);
        if (!r) {
          setLoading(false);
          return;
        }
        setResult(r);

        // Load session to get questionSetId (Firestore first, then localStorage)
        const session = await getSession(sessionId) || getSessionFromStorage(sessionId);
        const setId = session?.questionSetId || '';
        const qs = getQuestionsBySetId(setId);
        setQuestions(qs);

        const qSet = getQuestionSetById(setId);
        setQuestionSetTitle(qSet ? `${qSet.emoji} ${qSet.title}` : '');

        // Load answers for detailed comparison
        const allAnswers = await getAnswers(sessionId);
        const creatorMap = new Map<string, 'A' | 'B'>();
        const respondentMap = new Map<string, 'A' | 'B'>();

        for (const a of allAnswers.creator) {
          creatorMap.set(a.questionId, a.selectedOption);
        }
        for (const a of allAnswers.respondent) {
          respondentMap.set(a.questionId, a.selectedOption);
        }

        const questionMap = new Map<string, Question>();
        for (const q of qs) {
          questionMap.set(q.id, q);
        }

        const pm: MatchDetail[] = [];
        const om: MatchDetail[] = [];

        for (const [qid, creatorChoice] of creatorMap.entries()) {
          const respondentChoice = respondentMap.get(qid);
          if (!respondentChoice) continue;

          const question = questionMap.get(qid);
          if (!question) continue;

          if (creatorChoice === respondentChoice) {
            const choiceText = creatorChoice === 'A' ? question.optionA : question.optionB;
            pm.push({ questionText: question.text, choice: choiceText });
          } else {
            om.push({ questionText: question.text, choice: '' });
          }
        }

        setPerfectMatches(pm);
        setOppositeMatches(om);

        // Generate fun summary based on category scores
        const scores = r.categoryScores;
        const entries = Object.entries(scores);
        if (entries.length > 0) {
          const best = entries.reduce((a, b) => (a[1] >= b[1] ? a : b));
          const worst = entries.reduce((a, b) => (a[1] <= b[1] ? a : b));

          const bestLabel = categoryLabels[best[0]] || best[0];
          const worstLabel = categoryLabels[worst[0]] || worst[0];

          if (best[0] !== worst[0]) {
            setFunSummary(
              `${bestLabel} 취향은 소울메이트, ${worstLabel}은(는) 이질적인 조합!`
            );
          } else {
            setFunSummary(`${bestLabel} 분야에서 취향이 잘 통하는 사이!`);
          }
        }
      } catch (err) {
        console.error('Failed to load result:', err);
      }
      setLoading(false);
    }
    loadResult();
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
        <p className="text-5xl">🤷</p>
        <p className="text-lg font-semibold text-gray-600">결과를 찾을 수 없어요</p>
        <p className="text-sm text-gray-400 text-center">
          상대가 아직 답변하지 않았을 수 있어요
        </p>
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
  const interpretation = getInterpretation(result.syncRate);
  const categoryEntries = Object.entries(result.categoryScores);

  return (
    <div className="flex flex-col items-center px-5 py-8 pb-20">
      {/* Question set title */}
      {questionSetTitle && (
        <motion.p
          className="text-sm text-gray-400 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {questionSetTitle}
        </motion.p>
      )}

      {/* 1. SyncRateCircle with count-up */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <SyncRateCircle rate={result.syncRate} animate={true} />
      </motion.div>

      {/* 2. ResultBadge with bounce */}
      <motion.div
        className="mt-4"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 12 }}
      >
        <ResultBadge syncRate={result.syncRate} />
      </motion.div>

      {/* Interpretation text */}
      <motion.p
        className="mt-3 text-base font-semibold text-gray-700 text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        {interpretation}
      </motion.p>

      {/* 3. CategoryBars appearing one by one */}
      {categoryEntries.length > 0 && (
        <motion.div
          className="w-full mt-8 flex flex-col gap-4 bg-white rounded-2xl p-5 shadow-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <h3 className="text-sm font-bold text-gray-800 mb-1">카테고리별 싱크로율</h3>
          {categoryEntries.map(([cat, score], index) => (
            <CategoryBar
              key={cat}
              categoryName={categoryLabels[cat] || cat}
              matchRate={score}
              delay={1.2 + index * 0.2}
            />
          ))}
        </motion.div>
      )}

      {/* 4. Perfect matches section */}
      {perfectMatches.length > 0 && (
        <motion.div
          className="w-full mt-6 bg-white rounded-2xl p-5 shadow-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6 }}
        >
          <h3 className="text-base font-bold text-gray-900 mb-3">
            완전 일치! 🎯
          </h3>
          <div className="flex flex-col gap-2">
            {perfectMatches.map((match, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-2 text-sm"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.8 + i * 0.1 }}
              >
                <span className="text-green-500 shrink-0">✓</span>
                <div>
                  <span className="text-gray-700">{match.questionText}</span>
                  {match.choice && (
                    <span className="text-gray-400 ml-1">- {match.choice}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 5. Opposite matches section */}
      {oppositeMatches.length > 0 && (
        <motion.div
          className="w-full mt-4 bg-white rounded-2xl p-5 shadow-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.0 }}
        >
          <h3 className="text-base font-bold text-gray-900 mb-3">
            극과 극! ⚡
          </h3>
          <div className="flex flex-col gap-2">
            {oppositeMatches.map((match, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-2 text-sm"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 2.2 + i * 0.1 }}
              >
                <span className="text-red-400 shrink-0">✗</span>
                <span className="text-gray-700">{match.questionText}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Fun summary */}
      {funSummary && (
        <motion.div
          className="w-full mt-6 rounded-2xl p-5 text-center"
          style={{ backgroundColor: '#FFF5F5' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4 }}
        >
          <p className="text-sm font-medium text-gray-700 leading-relaxed">{funSummary}</p>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        className="w-full mt-8 flex flex-col gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6 }}
      >
        {/* Save result card */}
        <button
          className="w-full min-h-[52px] rounded-xl font-semibold text-base flex items-center justify-center gap-2 px-4 text-white"
          style={{ backgroundColor: '#FF6B6B' }}
          onClick={() => router.push(`/result/${sessionId}/card`)}
        >
          📸 결과 카드 저장
        </button>

        {/* Share via Kakao */}
        <button
          className="w-full min-h-[52px] rounded-xl font-semibold text-base flex items-center justify-center gap-2 px-4"
          style={{ backgroundColor: '#FEE500', color: '#191919' }}
          onClick={() => shareResult(result.syncRate, badge.emoji + ' ' + badge.label, sessionId)}
        >
          📱 카카오톡으로 결과 공유
        </button>

        {/* Try another set */}
        <button
          className="w-full min-h-[52px] rounded-xl font-semibold text-base flex items-center justify-center gap-2 px-4 bg-gray-100 text-gray-700"
          onClick={() => router.push('/')}
        >
          🔄 다른 세트로 다시 하기
        </button>

        {/* Home */}
        <button
          className="w-full min-h-[52px] rounded-xl font-semibold text-base flex items-center justify-center gap-2 px-4 bg-gray-50 text-gray-500"
          onClick={() => router.push('/')}
        >
          🏠 홈으로
        </button>
      </motion.div>

      {/* Viral CTA */}
      <motion.div
        className="w-full mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.0 }}
      >
        <button
          className="w-full min-h-[56px] rounded-2xl font-bold text-base text-white shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%)',
          }}
          onClick={() => router.push('/')}
        >
          나도 테스트 만들기 →
        </button>
      </motion.div>

      {/* Ad banner placeholder */}
      <motion.div
        className="w-full mt-8 h-[60px] rounded-xl bg-gray-100 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3.2 }}
      >
        <span className="text-xs text-gray-300">AD</span>
      </motion.div>
    </div>
  );
}
