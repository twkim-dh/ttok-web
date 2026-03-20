import { nanoid } from "nanoid";
import type { Session, Answer, Result } from "@/types";

// ---------------------------------------------------------------------------
// REST API ONLY (Firebase SDK 제거 - REST가 가장 안정적)
// ---------------------------------------------------------------------------

const FIRESTORE_PROJECT = "ttok-app";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/(default)/documents`;

// ---------------------------------------------------------------------------
// Firestore value converters
// ---------------------------------------------------------------------------

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "string") return { stringValue: val };
  if (typeof val === "number")
    return Number.isInteger(val)
      ? { integerValue: String(val) }
      : { doubleValue: val };
  if (typeof val === "boolean") return { booleanValue: val };
  if (Array.isArray(val))
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === "object") {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreFields(fields: Record<string, Record<string, unknown>>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v.stringValue !== undefined) result[k] = v.stringValue;
    else if (v.integerValue !== undefined) result[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) result[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) result[k] = v.booleanValue;
    else if (v.mapValue) {
      const mf = (v.mapValue as Record<string, unknown>).fields as Record<string, Record<string, unknown>>;
      if (mf) result[k] = fromFirestoreFields(mf);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// REST write - 핵심 함수 (모든 저장이 이걸 통해)
// ---------------------------------------------------------------------------

async function restWrite(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const url = `${BASE_URL}/${collectionName}/${docId}`;
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }

  try {
    const resp = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
      keepalive: true,
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "unknown");
      console.error(`[REST] WRITE FAILED ${collectionName}/${docId}: ${resp.status} ${errText}`);
      return false;
    }

    console.log(`[REST] WRITE OK ${collectionName}/${docId}`);
    return true;
  } catch (err) {
    console.error(`[REST] WRITE ERROR ${collectionName}/${docId}:`, err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// REST query
// ---------------------------------------------------------------------------

async function restQuery(
  collectionId: string,
  fieldPath: string,
  value: string,
  limit = 200
): Promise<Record<string, unknown>[]> {
  const url = `${BASE_URL}:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath },
          op: "EQUAL",
          value: { stringValue: value },
        },
      },
      limit,
    },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) return [];

    const data = await resp.json();
    const results: Record<string, unknown>[] = [];
    for (const item of data) {
      if (item.document?.fields) {
        results.push(fromFirestoreFields(item.document.fields));
      }
    }
    return results;
  } catch (err) {
    console.error(`[REST] QUERY ERROR ${collectionId}:`, err);
    return [];
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

  const ok = await restWrite("sessions", id, session as unknown as Record<string, unknown>);
  if (!ok) {
    throw new Error("Failed to create session in Firestore");
  }
  console.log("[createSession] OK shareCode:", shareCode);
  return session;
}

// ---------------------------------------------------------------------------
// getSessionByShareCode
// ---------------------------------------------------------------------------

export async function getSessionByShareCode(
  shareCode: string
): Promise<Session | null> {
  const results = await restQuery("sessions", "shareCode", shareCode, 1);
  if (results.length > 0) {
    console.log("[getSessionByShareCode] Found:", shareCode);
    return results[0] as unknown as Session;
  }
  console.log("[getSessionByShareCode] Not found:", shareCode);
  return null;
}

// ---------------------------------------------------------------------------
// getSession by ID
// ---------------------------------------------------------------------------

export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const resp = await fetch(`${BASE_URL}/sessions/${sessionId}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.fields) {
      return fromFirestoreFields(data.fields) as unknown as Session;
    }
  } catch (err) {
    console.error("[getSession] ERROR:", err);
  }
  return null;
}

// ---------------------------------------------------------------------------
// saveAnswers - 핵심! 순차적으로 저장 (병렬 X → 안정성 우선)
// ---------------------------------------------------------------------------

export async function saveAnswers(
  sessionId: string,
  userType: "creator" | "respondent",
  answers: { questionId: string; selectedOption: "A" | "B" }[],
  respondentId?: string
): Promise<void> {
  const now = new Date().toISOString();

  let savedCount = 0;
  const totalCount = answers.length;

  // 순차적으로 하나씩 저장 (병렬보다 안정적)
  for (const answer of answers) {
    const id = nanoid();
    const doc: Record<string, unknown> = {
      id,
      sessionId,
      userType,
      questionId: answer.questionId,
      selectedOption: answer.selectedOption,
      answeredAt: now,
    };
    if (respondentId) {
      doc.respondentId = respondentId;
    }

    const ok = await restWrite("answers", id, doc);
    if (ok) savedCount++;
  }

  console.log(`[saveAnswers] ${savedCount}/${totalCount} saved, userType: ${userType}, session: ${sessionId}`);

  if (savedCount === 0) {
    throw new Error(`All ${totalCount} answers failed to save`);
  }
}

// ---------------------------------------------------------------------------
// getAnswers
// ---------------------------------------------------------------------------

export async function getAnswers(
  sessionId: string,
  respondentId?: string
): Promise<{ creator: Answer[]; respondent: Answer[] }> {
  const all = await restQuery("answers", "sessionId", sessionId, 200);

  const creator = all.filter((a) => a.userType === "creator") as unknown as Answer[];
  let respondent = all.filter((a) => a.userType === "respondent") as unknown as Answer[];

  if (respondentId) {
    respondent = respondent.filter(
      (a) => (a as unknown as Record<string, unknown>).respondentId === respondentId
    );
  }

  console.log(`[getAnswers] creator: ${creator.length}, respondent: ${respondent.length}`);
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

  const ok = await restWrite("results", id, full as unknown as Record<string, unknown>);
  if (!ok) {
    throw new Error("Failed to save result");
  }
  console.log("[saveResult] OK:", id);
  return id;
}

// ---------------------------------------------------------------------------
// getResult
// ---------------------------------------------------------------------------

export async function getResult(
  sessionId: string,
  respondentId?: string
): Promise<Result | null> {
  const results = await restQuery("results", "sessionId", sessionId, 50);

  if (respondentId) {
    const filtered = results.filter((r) => r.respondentId === respondentId);
    return filtered.length > 0 ? (filtered[0] as unknown as Result) : null;
  }

  return results.length > 0 ? (results[0] as unknown as Result) : null;
}

// ---------------------------------------------------------------------------
// getAllResults
// ---------------------------------------------------------------------------

export async function getAllResults(sessionId: string): Promise<Result[]> {
  const results = await restQuery("results", "sessionId", sessionId, 200);
  return results as unknown as Result[];
}

// ---------------------------------------------------------------------------
// incrementPlayCount (best effort, 실패해도 무시)
// ---------------------------------------------------------------------------

export async function incrementPlayCount(questionSetId: string): Promise<void> {
  try {
    const countDoc = `playCount_${questionSetId}`;
    const resp = await fetch(`${BASE_URL}/counters/${countDoc}`);
    let current = 0;
    if (resp.ok) {
      const data = await resp.json();
      if (data.fields?.count?.integerValue) {
        current = Number(data.fields.count.integerValue);
      }
    }
    await restWrite("counters", countDoc, { count: current + 1, questionSetId });
  } catch {
    // 실패해도 무시
  }
}
