'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { nanoid } from 'nanoid';
import ProgressBar from '@/components/ProgressBar';
import OptionButton from '@/components/OptionButton';
import { getQuestionsBySetId, getQuestionSetById } from '@/data/questions';
import { createSession, saveAnswers, incrementPlayCount } from '@/lib/firestore-service';
import type { Question } from '@/types';

interface PlayPageProps {
  params: Promise<{ setId: string }>;
}

export default function PlayPage({ params }: PlayPageProps) {
  const { setId } = use(params);
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionSet, setQuestionSet] = useState<ReturnType<typeof getQuestionSetById>>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<'A' | 'B'>>([]);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | null>(null);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const qs = getQuestionsBySetId(setId);
    const set = getQuestionSetById(setId);
    // Shuffle questions randomly each time
    const shuffled = [...qs].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setQuestionSet(set);
  }, [setId]);

  // Prevent back navigation during quiz
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSelect = useCallback(
    async (option: 'A' | 'B') => {
      if (selectedOption || isSubmitting) return;
      setSelectedOption(option);

      const newAnswers = [...answers, option];
      setAnswers(newAnswers);

      setTimeout(async () => {
        if (currentIndex < questions.length - 1) {
          setDirection(1);
          setSelectedOption(null);
          setCurrentIndex((prev) => prev + 1);
        } else {
          // Last question: create session and navigate
          setIsSubmitting(true);
          try {
            const creatorId = nanoid();
            const session = await createSession(creatorId, setId);

            // Save creator answers
            const answerPayloads = questions.map((q, idx) => ({
              questionId: q.id,
              selectedOption: newAnswers[idx] as 'A' | 'B',
            }));
            await saveAnswers(session.id, 'creator', answerPayloads);
            await incrementPlayCount(setId);

            router.push(`/share/${session.id}`);
          } catch (err) {
            console.error('Failed to save session:', err);
            // Fallback: save to localStorage directly
            const sessionId = nanoid();
            const shareCode = nanoid(6);
            const session = {
              id: sessionId,
              creatorId: nanoid(),
              questionSetId: setId,
              shareCode,
              status: 'waiting' as const,
              createdAt: new Date().toISOString(),
            };
            localStorage.setItem(`session:${sessionId}`, JSON.stringify(session));
            localStorage.setItem(`shareCode:${shareCode}`, JSON.stringify(sessionId));

            const answerPayloads = questions.map((q, idx) => ({
              id: nanoid(),
              sessionId,
              userType: 'creator' as const,
              questionId: q.id,
              selectedOption: newAnswers[idx] as 'A' | 'B',
              answeredAt: new Date().toISOString(),
            }));
            localStorage.setItem(`answers:${sessionId}:creator`, JSON.stringify(answerPayloads));

            router.push(`/share/${sessionId}`);
          }
        }
      }, 500);
    },
    [selectedOption, isSubmitting, answers, currentIndex, questions, setId, router]
  );

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen px-5">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-lg font-semibold text-gray-500">로딩 중...</p>
        </motion.div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="flex flex-col min-h-screen px-5 pt-6 pb-8">
      {/* Header */}
      <div className="mb-2">
        {questionSet && (
          <p className="text-sm text-gray-400 text-center mb-3">
            {questionSet.emoji} {questionSet.title}
          </p>
        )}
        <ProgressBar current={currentIndex + 1} total={questions.length} />
      </div>

      {/* Question Area */}
      <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQuestion.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex flex-col items-center gap-8"
          >
            {/* Question Text */}
            <h2 className="text-xl font-bold text-gray-900 text-center leading-relaxed px-2">
              {currentQuestion.text}
            </h2>

            {/* Options */}
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

      {/* Submitting indicator */}
      {isSubmitting && (
        <motion.div
          className="fixed inset-0 bg-white/80 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="w-10 h-10 border-4 rounded-full"
              style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            />
            <p className="text-sm font-medium text-gray-500">결과 저장 중...</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
