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
  writeBatch,
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
// REST API fallback for Firestore writes
// ---------------------------------------------------------------------------

const FIRESTORE_PROJECT = "ttok-app";

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number") return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as unknown as Record<string, unknown>)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(data: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  return { fields };
}

async function restWrite(collectionName: string, docId: string, data: Record<string, unknown>): Promise<boolean> {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/${collectionName}/${docId}`;
    const body = JSON.stringify(toFirestoreDoc(data));
    const resp = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
    const ok = resp.ok;
    if (!ok) {
      const errText = await resp.text();
      console.error(`[REST] Write failed ${collectionName}/${docId}: ${resp.status} ${errText}`);
    }
    return ok;
  } catch (err) {
    console.error(`[REST] Write error ${collectionName}/${docId}:`, err);
    return false;
  }
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

  // Always save to localStorage (same device fallback)
  lsSet(`session:${id}`, session);
  lsSet(`shareCode:${shareCode}`, id);

  // Save to Firestore via REST API
  const ok = await restWrite("sessions", id, session as unknown as Record<string, unknown>);
  console.log("[REST] Session saved:", shareCode, "success:", ok);

  return session;
}

// ---------------------------------------------------------------------------
// getSessionByShareCode
// ---------------------------------------------------------------------------

export async function getSessionByShareCode(
  shareCode: string
): Promise<Session | null> {
  // Try REST API first (cross-device)
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents:runQuery`;
    const structuredQuery = {
      from: [{ collectionId: "sessions" }],
      where: { fieldFilter: { field: { fieldPath: "shareCode" }, op: "EQUAL", value: { stringValue: shareCode } } },
      limit: 1,
    };
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.length > 0 && data[0].document) {
        const fields = data[0].document.fields;
        const session: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          const val = v as Record<string, unknown>;
          if (val.stringValue !== undefined) session[k] = val.stringValue;
          else if (val.integerValue !== undefined) session[k] = Number(val.integerValue);
        }
        console.log("[REST] Session found for shareCode:", shareCode);
        return session as unknown as Session;
      }
    }
  } catch (err) {
    console.error("[REST] getSessionByShareCode failed:", err);
  }

  // localStorage fallback (same device)
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
  const fullAnswers: Answer[] = answers.map((a) => {
    const answer: Record<string, unknown> = {
      ...a,
      id: nanoid(),
      sessionId,
      userType,
      answeredAt: now,
    };
    if (respondentId) {
      answer.respondentId = respondentId;
    }
    return answer as unknown as Answer;
  });

  // Always save to localStorage
  if (userType === "creator") {
    lsSet(`answers:${sessionId}:creator`, fullAnswers);
  } else {
    const key = `answers:${sessionId}:respondent:${respondentId}`;
    lsSet(key, fullAnswers);
    const listKey = `respondents:${sessionId}`;
    const list = lsGet<string[]>(listKey) ?? [];
    if (respondentId && !list.includes(respondentId)) {
      list.push(respondentId);
      lsSet(listKey, list);
    }
  }

  // Save to Firestore via REST API (most reliable)
  const restPromises = fullAnswers.map((answer) =>
    restWrite("answers", answer.id, answer as unknown as Record<string, unknown>)
  );
  const results = await Promise.all(restPromises);
  const savedCount = results.filter(Boolean).length;
  console.log(`[REST] Answers saved: ${savedCount}/${fullAnswers.length}, userType: ${userType}`);

  if (savedCount === 0) {
    throw new Error(`All ${fullAnswers.length} answers failed to save to Firestore`);
  }
  if (savedCount < fullAnswers.length) {
    console.warn(`[REST] Warning: only ${savedCount}/${fullAnswers.length} answers saved`);
  }
}

// ---------------------------------------------------------------------------
// getAnswers
// ---------------------------------------------------------------------------

export async function getAnswers(
  sessionId: string,
  respondentId?: string
): Promise<{ creator: Answer[]; respondent: Answer[] }> {
  let creator: Answer[] = [];
  let respondent: Answer[] = [];

  // Try REST API first (cross-device)
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents:runQuery`;
    const structuredQuery = {
      from: [{ collectionId: "answers" }],
      where: { fieldFilter: { field: { fieldPath: "sessionId" }, op: "EQUAL", value: { stringValue: sessionId } } },
      limit: 200,
    };
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const all: Answer[] = [];
      for (const item of data) {
        if (!item.document) continue;
        const fields = item.document.fields;
        const answer: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          const val = v as unknown as Record<string, unknown>;
          if (val.stringValue !== undefined) answer[k] = val.stringValue;
          else if (val.integerValue !== undefined) answer[k] = Number(val.integerValue);
        }
        all.push(answer as unknown as Answer);
      }
      creator = all.filter((a) => a.userType === "creator");
      respondent = all.filter((a) => a.userType === "respondent");
      if (respondentId) {
        respondent = respondent.filter((a) => (a as unknown as Record<string, unknown>).respondentId === respondentId);
      }
      console.log("[REST] getAnswers - creator:", creator.length, "respondent:", respondent.length);
    }
  } catch (err) {
    console.error("[REST] getAnswers failed:", err);
  }

  // Fallback to localStorage
  if (creator.length === 0) {
    creator = lsGet<Answer[]>(`answers:${sessionId}:creator`) ?? [];
  }
  if (respondent.length === 0 && respondentId) {
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

  // Save to localStorage
  lsSet(`result:${sessionId}:${result.respondentId}`, full);
  const listKey = `results:${sessionId}`;
  const list = lsGet<Result[]>(listKey) ?? [];
  list.push(full);
  lsSet(listKey, list);

  // Save to Firestore via REST API
  await restWrite("results", full.id, full as unknown as Record<string, unknown>);
  console.log("[REST] Result saved:", full.id);

  return id;
}

// ---------------------------------------------------------------------------
// getResult — 특정 응답자의 결과
// ---------------------------------------------------------------------------

export async function getResult(
  sessionId: string,
  respondentId?: string
): Promise<Result | null> {
  // Try REST API first (cross-device)
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents:runQuery`;
    const structuredQuery: Record<string, unknown> = {
      from: [{ collectionId: "results" }],
      where: {
        compositeFilter: {
          op: "AND",
          filters: [
            { fieldFilter: { field: { fieldPath: "sessionId" }, op: "EQUAL", value: { stringValue: sessionId } } },
            ...(respondentId ? [{ fieldFilter: { field: { fieldPath: "respondentId" }, op: "EQUAL", value: { stringValue: respondentId } } }] : []),
          ],
        },
      },
    };
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery }),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.length > 0 && data[0].document) {
        const fields = data[0].document.fields;
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(fields)) {
          const val = v as unknown as Record<string, unknown>;
          if (val.stringValue !== undefined) result[k] = val.stringValue;
          else if (val.integerValue !== undefined) result[k] = Number(val.integerValue);
          else if (val.doubleValue !== undefined) result[k] = Number(val.doubleValue);
          else if (val.mapValue) {
            const map: Record<string, number> = {};
            const mf = (val.mapValue as unknown as Record<string, unknown>).fields as Record<string, Record<string, unknown>>;
            if (mf) {
              for (const [mk, mv] of Object.entries(mf)) {
                map[mk] = Number(mv.integerValue ?? mv.doubleValue ?? 0);
              }
            }
            result[k] = map;
          }
        }
        console.log("[REST] getResult found:", result.id);
        return result as unknown as Result;
      }
    }
  } catch (err) {
    console.error("[REST] getResult failed:", err);
  }

  // Fallback to localStorage
  if (respondentId) {
    return lsGet<Result>(`result:${sessionId}:${respondentId}`);
  }
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
  // Try REST API first
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents/sessions/${sessionId}`;
    const resp = await fetch(url);
    if (resp.ok) {
      const data = await resp.json();
      const fields = data.fields;
      const session: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) {
        const val = v as unknown as Record<string, unknown>;
        if (val.stringValue !== undefined) session[k] = val.stringValue;
        else if (val.integerValue !== undefined) session[k] = Number(val.integerValue);
      }
      console.log("[REST] getSession found:", sessionId);
      return session as unknown as Session;
    }
  } catch (err) {
    console.error("[REST] getSession failed:", err);
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
