'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShareButtonsProps {
  onKakaoShare: () => void;
  onCopyLink: () => void;
  onSmsShare: () => void;
  shareUrl: string;
}

export default function ShareButtons({
  onKakaoShare,
  onCopyLink,
  onSmsShare,
  shareUrl,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onCopyLink();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      onCopyLink();
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl, onCopyLink]);

  const handleSmsShare = useCallback(() => {
    const body = encodeURIComponent(
      `똑! 우리 취향 얼마나 통할까? 지금 확인해봐! ${shareUrl}`
    );
    window.open(`sms:?body=${body}`, '_self');
    onSmsShare();
  }, [shareUrl, onSmsShare]);

  return (
    <div className="flex flex-col gap-3 w-full relative">
      {/* Kakao */}
      <motion.button
        className="w-full min-h-[52px] rounded-xl font-semibold text-base flex items-center justify-center gap-2 px-4"
        style={{ backgroundColor: '#FEE500', color: '#191919' }}
        whileTap={{ scale: 0.97 }}
        onClick={onKakaoShare}
        type="button"
      >
        <span className="text-xl">📱</span>
        카카오톡으로 보내기
      </motion.button>

      {/* Copy Link */}
      <motion.button
        className="w-full min-h-[52px] rounded-xl font-semibold text-base flex items-center justify-center gap-2 px-4 bg-gray-100 text-gray-700"
        whileTap={{ scale: 0.97 }}
        onClick={handleCopyLink}
        type="button"
      >
        <span className="text-xl">🔗</span>
        {copied ? '복사 완료! ✓' : '링크 복사'}
      </motion.button>

      {/* SMS */}
      <motion.button
        className="w-full min-h-[52px] rounded-xl font-semibold text-base flex items-center justify-center gap-2 px-4 text-white"
        style={{ backgroundColor: '#4CAF50' }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSmsShare}
        type="button"
      >
        <span className="text-xl">💬</span>
        문자로 보내기
      </motion.button>

      {/* Toast */}
      <AnimatePresence>
        {copied && (
          <motion.div
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg z-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25 }}
          >
            복사 완료! ✓
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
