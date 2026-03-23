"use client";

const services = [
  { emoji: "🍽️", name: "오늘 뭐먹?", url: "https://mwomuk.dhlm-studio.com", desc: "같이 메뉴 고르기" },
  { emoji: "💕", name: "똑(Ttok)", url: "https://ttok.dhlm-studio.com", desc: "취향 싱크로율" },
  { emoji: "🎰", name: "돌려돌려", url: "https://spin.dhlm-studio.com", desc: "룰렛 돌리기" },
  { emoji: "🎯", name: "나를 맞춰봐", url: "https://guessme.dhlm-studio.com", desc: "친구 퀴즈" },
  { emoji: "⚡", name: "밸런스 게임", url: "https://balance.dhlm-studio.com", desc: "매일 투표" },
  { emoji: "🎱", name: "로또 번호", url: "https://lotto.dhlm-studio.com", desc: "행운의 번호" },
  { emoji: "🛠️", name: "무료 도구 80개", url: "https://tools.dhlm-studio.com", desc: "계산기/변환기" },
];

export default function CrossPromo({ current }: { current?: string }) {
  const others = services
    .filter((s) => !current || !s.url.includes(current))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return (
    <div className="mt-8 border-t pt-6">
      <p className="text-sm text-gray-400 mb-3">이것도 해보세요 👀</p>
      <div className="space-y-2">
        {others.map((s) => (
          <a
            key={s.url}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl">{s.emoji}</span>
            <div>
              <p className="font-semibold text-sm text-gray-800">{s.name}</p>
              <p className="text-xs text-gray-400">{s.desc}</p>
            </div>
          </a>
        ))}
      </div>
      <a href="https://dhlm-studio.com" target="_blank" rel="noopener noreferrer"
        className="block text-center text-xs text-gray-300 mt-4 hover:text-gray-500">
        DHLM Studio
      </a>
    </div>
  );
}
