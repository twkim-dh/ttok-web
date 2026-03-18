import type { Answer, Question } from "@/types";

interface CalculatedResult {
  syncRate: number;
  totalQuestions: number;
  matchedCount: number;
  categoryScores: Record<string, number>;
  summaryText: string;
  perfectMatches: string[];
  oppositeMatches: string[];
}

function getBadge(syncRate: number): { emoji: string; label: string } {
  if (syncRate >= 86) return { emoji: "🎯", label: "거의 한 사람" };
  if (syncRate >= 71) return { emoji: "💕", label: "찰떡궁합" };
  if (syncRate >= 51) return { emoji: "😊", label: "은근 잘 통함" };
  if (syncRate >= 31) return { emoji: "🤔", label: "의외로 다른 조합" };
  return { emoji: "🔥", label: "완전 반대 매력" };
}

function getInterpretation(syncRate: number): string {
  if (syncRate >= 86) return "\uD83C\uDFAF 거의 한 사람";
  if (syncRate >= 71) return "\uD83D\uDC95 찰떡궁합";
  if (syncRate >= 51) return "\uD83D\uDE0A 은근 잘 통함";
  if (syncRate >= 31) return "\uD83E\uDD14 의외로 다른 조합";
  return "\uD83D\uDD25 완전 반대 매력";
}

function generateSummary(
  syncRate: number,
  categoryScores: Record<string, number>,
  matchedCount: number,
  totalQuestions: number,
  perfectMatches: string[],
  oppositeMatches: string[]
): string {
  const interpretation = getInterpretation(syncRate);
  const lines: string[] = [];

  lines.push(`${interpretation}`);
  lines.push(
    `${totalQuestions}개 질문 중 ${matchedCount}개가 같았어요! (${syncRate}%)`
  );

  // Find best and worst categories
  const categoryEntries = Object.entries(categoryScores);
  if (categoryEntries.length > 0) {
    const best = categoryEntries.reduce((a, b) =>
      a[1] >= b[1] ? a : b
    );
    const worst = categoryEntries.reduce((a, b) =>
      a[1] <= b[1] ? a : b
    );

    const categoryLabels: Record<string, string> = {
      friendship: "우정",
      romance: "연애",
      flirting: "썸",
      food: "음식",
      balance: "밸런스",
    };

    if (best[1] > 0) {
      lines.push(
        `가장 잘 맞는 분야: ${categoryLabels[best[0]] ?? best[0]} (${best[1]}%)`
      );
    }

    if (worst[0] !== best[0]) {
      lines.push(
        `가장 다른 분야: ${categoryLabels[worst[0]] ?? worst[0]} (${worst[1]}%)`
      );
    }
  }

  if (perfectMatches.length > 0) {
    lines.push(`완벽히 같은 답: "${perfectMatches[0]}" 외 ${Math.max(0, perfectMatches.length - 1)}개`);
  }

  if (oppositeMatches.length > 0) {
    lines.push(`완전 반대 답: "${oppositeMatches[0]}" 외 ${Math.max(0, oppositeMatches.length - 1)}개`);
  }

  if (syncRate >= 86) {
    lines.push("혹시 전생에 같은 사람이었나요? 취향이 거의 똑같아요!");
  } else if (syncRate >= 71) {
    lines.push("서로 통하는 게 많네요! 함께하면 즐거울 거예요.");
  } else if (syncRate >= 51) {
    lines.push("비슷한 듯 다른 매력! 같이 있으면 심심하지 않겠어요.");
  } else if (syncRate >= 31) {
    lines.push("다른 점이 많지만, 그래서 더 재미있을 수 있어요!");
  } else {
    lines.push("완전 정반대! 오히려 서로에게 새로운 세계를 보여줄 수 있어요.");
  }

  return lines.join("\n");
}

export function calculateSyncRate(
  creatorAnswers: Answer[],
  respondentAnswers: Answer[],
  questions: Question[]
): CalculatedResult {
  const questionMap = new Map<string, Question>();
  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  // Build lookup: questionId -> selected option for each user
  const creatorMap = new Map<string, "A" | "B">();
  for (const a of creatorAnswers) {
    creatorMap.set(a.questionId, a.selectedOption);
  }

  const respondentMap = new Map<string, "A" | "B">();
  for (const a of respondentAnswers) {
    respondentMap.set(a.questionId, a.selectedOption);
  }

  // Collect all question ids that both users answered
  const commonQuestionIds = [...creatorMap.keys()].filter((qid) =>
    respondentMap.has(qid)
  );

  const totalQuestions = commonQuestionIds.length;

  // Per-category tracking
  const categoryTotal: Record<string, number> = {};
  const categoryMatched: Record<string, number> = {};

  let matchedCount = 0;
  const perfectMatches: string[] = [];
  const oppositeMatches: string[] = [];

  for (const qid of commonQuestionIds) {
    const creatorChoice = creatorMap.get(qid)!;
    const respondentChoice = respondentMap.get(qid)!;
    const question = questionMap.get(qid);
    const category = question?.category ?? "unknown";
    const questionText = question?.text ?? qid;

    categoryTotal[category] = (categoryTotal[category] ?? 0) + 1;

    if (creatorChoice === respondentChoice) {
      matchedCount++;
      categoryMatched[category] = (categoryMatched[category] ?? 0) + 1;
      perfectMatches.push(questionText);
    } else {
      oppositeMatches.push(questionText);
    }
  }

  // Calculate overall sync rate
  const syncRate =
    totalQuestions > 0 ? Math.round((matchedCount / totalQuestions) * 100) : 0;

  // Calculate category-wise scores
  const categoryScores: Record<string, number> = {};
  for (const cat of Object.keys(categoryTotal)) {
    const total = categoryTotal[cat];
    const matched = categoryMatched[cat] ?? 0;
    categoryScores[cat] = total > 0 ? Math.round((matched / total) * 100) : 0;
  }

  const summaryText = generateSummary(
    syncRate,
    categoryScores,
    matchedCount,
    totalQuestions,
    perfectMatches,
    oppositeMatches
  );

  return {
    syncRate,
    totalQuestions,
    matchedCount,
    categoryScores,
    summaryText,
    perfectMatches,
    oppositeMatches,
  };
}

export { getBadge, getInterpretation };
