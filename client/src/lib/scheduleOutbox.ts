export type ScheduleOutboxOperation = {
  id: string;
  kind: "create" | "update" | "status";
  payload: Record<string, unknown>;
  createdAt: number;
  lastError: string | null;
};

const DATABASE_NAME = "personal-work-os";
const STORE_NAME = "schedule-outbox";
const DATABASE_VERSION = 2;

function openDatabase() {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.reject(new Error("이 기기에서는 일정 대기함을 사용할 수 없습니다."));
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("일정 대기함을 열 수 없습니다."));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("capture-outbox")) request.result.createObjectStore("capture-outbox", { keyPath: "id" });
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = work(transaction.objectStore(STORE_NAME));
    request.onerror = () => reject(request.error ?? new Error("일정 대기함을 갱신할 수 없습니다."));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("일정 대기함을 갱신할 수 없습니다.")); };
  });
}

export function createScheduleOutboxId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export async function listPendingScheduleOperations() {
  const items = await withStore<ScheduleOutboxOperation[]>("readonly", store => store.getAll());
  return items.sort((left, right) => left.createdAt - right.createdAt);
}

export async function savePendingScheduleOperation(operation: ScheduleOutboxOperation) {
  await withStore<IDBValidKey>("readwrite", store => store.put(operation));
}

export async function removePendingScheduleOperation(id: string) {
  await withStore<undefined>("readwrite", store => store.delete(id));
}

export async function setPendingScheduleOperationError(operation: ScheduleOutboxOperation, lastError: string | null) {
  await savePendingScheduleOperation({ ...operation, lastError });
}
