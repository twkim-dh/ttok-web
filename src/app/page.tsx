'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Logo from '@/components/Logo';
import QuestionCard from '@/components/QuestionCard';
import { questionSets } from '@/data/questions';
import { initKakao } from '@/lib/kakao';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    initKakao();
  }, []);

  const sortedSets = [...questionSets]
    .filter((s) => s.isActive)
    .sort((a, b) => b.playCount - a.playCount);

  return (
    <div className="flex flex-col items-center px-5 pb-12 pt-4">
      {/* Logo */}
      <Logo />

      {/* Heading */}
      <motion.h1
        className="text-lg font-bold text-gray-800 text-center mt-2 mb-6 leading-relaxed"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        친구와 취향이 얼마나 맞는지
        <br />
        확인해보세요
      </motion.h1>

      {/* Question Set Cards */}
      <motion.div
        className="w-full flex flex-col gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {sortedSets.map((set) => (
          <motion.div key={set.id} variants={itemVariants}>
            <QuestionCard
              questionSet={set}
              onClick={() => router.push(`/play/${set.id}`)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.footer
        className="mt-12 flex flex-col items-center gap-2 text-xs text-gray-300"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <span>만든 사람: DHLM Studio</span>
        <a
          href="https://sites.google.com/view/dhlm-studio-privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-gray-400 hover:text-gray-500"
        >
          개인정보처리방침
        </a>
      </motion.footer>
    </div>
  );
}
