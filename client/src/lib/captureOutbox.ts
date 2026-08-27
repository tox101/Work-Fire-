export type PendingCaptureFile = {
  clientUploadId: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
};

export type PendingCapture = {
  id: string;
  content: string;
  sourceType: "capture" | "link";
  projectId: number | null;
  stageId: number | null;
  taskId: number | null;
  tags: string[];
  files: PendingCaptureFile[];
  createdAt: number;
  lastError: string | null;
};

const DATABASE_NAME = "personal-work-os";
const STORE_NAME = "capture-outbox";
const DATABASE_VERSION = 1;

function openDatabase() {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.reject(new Error("이 기기에서는 전송 대기함을 사용할 수 없습니다."));
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error ?? new Error("전송 대기함을 열 수 없습니다."));
    request.onupgradeneeded = () => {
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
    request.onerror = () => reject(request.error ?? new Error("전송 대기함을 갱신할 수 없습니다."));
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("전송 대기함을 갱신할 수 없습니다.")); };
  });
}

export async function listPendingCaptures() {
  const captures = await withStore<PendingCapture[]>("readonly", store => store.getAll());
  return captures.sort((left, right) => left.createdAt - right.createdAt);
}

export async function savePendingCapture(capture: PendingCapture) {
  await withStore<IDBValidKey>("readwrite", store => store.put(capture));
}

export async function removePendingCapture(id: string) {
  await withStore<undefined>("readwrite", store => store.delete(id));
}

export async function setPendingCaptureError(capture: PendingCapture, lastError: string | null) {
  await savePendingCapture({ ...capture, lastError });
}
