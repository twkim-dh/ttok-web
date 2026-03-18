export interface QuestionSet {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  category: "friendship" | "romance" | "flirting" | "food" | "balance";
  questionCount: number;
  playCount: number;
  isActive: boolean;
}

export interface Question {
  id: string;
  setId: string;
  text: string;
  optionA: string;
  optionB: string;
  category: "friendship" | "romance" | "flirting" | "food" | "balance";
  order: number;
}

export interface Session {
  id: string;
  creatorId: string;
  questionSetId: string;
  shareCode: string;
  status: "waiting" | "completed";
  createdAt: string;
  completedAt?: string;
}

export interface Answer {
  id: string;
  sessionId: string;
  userType: "creator" | "respondent";
  respondentId?: string;
  questionId: string;
  selectedOption: "A" | "B";
  answeredAt: string;
}

export interface Result {
  id: string;
  sessionId: string;
  respondentId: string;
  respondentName: string;
  syncRate: number;
  totalQuestions: number;
  matchedCount: number;
  categoryScores: Record<string, number>;
  summaryText: string;
  createdAt: string;
}

export interface DashboardData {
  session: Session;
  results: Result[];
}
