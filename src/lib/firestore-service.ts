import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  increment,
  updateDoc,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import { db, isFirebaseConfigured } from "./firebase";
import type { Session, Answer, Result } from "@/types";

// ---------------------------------------------------------------------------
// localStorage helpers (fallback when Firebase is not configured)
// ---------------------------------------------------------------------------

function lsGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function lsSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function lsGetAll<T>(prefix: string): T[] {
  if (typeof window === "undefined") return [];
  const items: T[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        items.push(JSON.parse(localStorage.getItem(key)!) as T);
      } catch {
        // skip malformed entries
      }
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------

export async function createSession(
  creatorId: string,
  questionSetId: string
): Promise<Session> {
  const id = nanoid();
  const shareCode = nanoid(6);
  const session: Session = {
    id,
    creatorId,
    questionSetId,
    shareCode,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "sessions", id), session);
  } else {
    lsSet(`session:${id}`, session);
    lsSet(`shareCode:${shareCode}`, id);
  }

  return session;
}

// ---------------------------------------------------------------------------
// getSessionByShareCode
// ---------------------------------------------------------------------------

export async function getSessionByShareCode(
  shareCode: string
): Promise<Session | null> {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, "sessions"),
      where("shareCode", "==", shareCode)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Session;
  }

  // localStorage fallback
  const sessionId = lsGet<string>(`shareCode:${shareCode}`);
  if (!sessionId) return null;
  return lsGet<Session>(`session:${sessionId}`);
}

// ---------------------------------------------------------------------------
// saveAnswers
// ---------------------------------------------------------------------------

export async function saveAnswers(
  sessionId: string,
  userType: "creator" | "respondent",
  answers: Omit<Answer, "id" | "sessionId" | "userType" | "answeredAt">[],
  respondentId?: string
): Promise<void> {
  const now = new Date().toISOString();
  const fullAnswers: Answer[] = answers.map((a) => ({
    ...a,
    id: nanoid(),
    sessionId,
    userType,
    respondentId,
    answeredAt: now,
  }));

  if (isFirebaseConfigured && db) {
    for (const answer of fullAnswers) {
      await setDoc(doc(db, "answers", answer.id), answer);
    }
  } else {
    if (userType === "creator") {
      lsSet(`answers:${sessionId}:creator`, fullAnswers);
    } else {
      // 1:N — 응답자별로 저장
      const key = `answers:${sessionId}:respondent:${respondentId}`;
      lsSet(key, fullAnswers);
      // 응답자 목록에 추가
      const listKey = `respondents:${sessionId}`;
      const list = lsGet<string[]>(listKey) ?? [];
      if (!list.includes(respondentId!)) {
        list.push(respondentId!);
        lsSet(listKey, list);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// getAnswers
// ---------------------------------------------------------------------------

export async function getAnswers(
  sessionId: string,
  respondentId?: string
): Promise<{ creator: Answer[]; respondent: Answer[] }> {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, "answers"),
      where("sessionId", "==", sessionId)
    );
    const snap = await getDocs(q);
    const all = snap.docs.map((d) => d.data() as Answer);
    const creator = all.filter((a) => a.userType === "creator");
    let respondent = all.filter((a) => a.userType === "respondent");
    if (respondentId) {
      respondent = respondent.filter((a) => a.respondentId === respondentId);
    }
    return { creator, respondent };
  }

  // localStorage fallback
  const creator = lsGet<Answer[]>(`answers:${sessionId}:creator`) ?? [];
  let respondent: Answer[] = [];
  if (respondentId) {
    respondent = lsGet<Answer[]>(`answers:${sessionId}:respondent:${respondentId}`) ?? [];
  }
  return { creator, respondent };
}

// ---------------------------------------------------------------------------
// saveResult
// ---------------------------------------------------------------------------

export async function saveResult(
  sessionId: string,
  result: Omit<Result, "id" | "sessionId" | "createdAt">
): Promise<string> {
  const id = nanoid();
  const full: Result = {
    ...result,
    id,
    sessionId,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "results", full.id), full);
  } else {
    // 1:N — 응답자별 결과 저장
    lsSet(`result:${sessionId}:${result.respondentId}`, full);
    // 전체 결과 목록에도 추가
    const listKey = `results:${sessionId}`;
    const list = lsGet<Result[]>(listKey) ?? [];
    list.push(full);
    lsSet(listKey, list);
  }

  return id;
}

// ---------------------------------------------------------------------------
// getResult — 특정 응답자의 결과
// ---------------------------------------------------------------------------

export async function getResult(
  sessionId: string,
  respondentId?: string
): Promise<Result | null> {
  if (isFirebaseConfigured && db) {
    const constraints = [where("sessionId", "==", sessionId)];
    if (respondentId) {
      constraints.push(where("respondentId", "==", respondentId));
    }
    const q = query(collection(db, "results"), ...constraints);
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Result;
  }

  if (respondentId) {
    return lsGet<Result>(`result:${sessionId}:${respondentId}`);
  }
  // 첫 번째 결과 반환 (하위호환)
  const list = lsGet<Result[]>(`results:${sessionId}`);
  return list && list.length > 0 ? list[0] : null;
}

// ---------------------------------------------------------------------------
// getAllResults — 세션의 모든 응답자 결과 (대시보드용)
// ---------------------------------------------------------------------------

export async function getAllResults(sessionId: string): Promise<Result[]> {
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, "results"),
      where("sessionId", "==", sessionId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Result);
  }

  return lsGet<Result[]>(`results:${sessionId}`) ?? [];
}

// ---------------------------------------------------------------------------
// getSession by ID
// ---------------------------------------------------------------------------

export async function getSession(sessionId: string): Promise<Session | null> {
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, "sessions", sessionId));
    if (!snap.exists()) return null;
    return snap.data() as Session;
  }
  return lsGet<Session>(`session:${sessionId}`);
}

// ---------------------------------------------------------------------------
// incrementPlayCount
// ---------------------------------------------------------------------------

export async function incrementPlayCount(
  questionSetId: string
): Promise<void> {
  if (isFirebaseConfigured && db) {
    const ref = doc(db, "questionSets", questionSetId);
    await updateDoc(ref, { playCount: increment(1) });
  } else {
    const key = `playCount:${questionSetId}`;
    const current = lsGet<number>(key) ?? 0;
    lsSet(key, current + 1);
  }
}
