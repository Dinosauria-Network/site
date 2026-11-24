/** Toast notification system (Phase 5). */
type NoticeLevel = "success" | "error" | "info";
interface Notice { id: string; message: string; level: NoticeLevel; at: number }

let notices: Notice[] = [];
const listeners = new Set<() => void>();

export function emitNotice(message: string, level: NoticeLevel = "info"): string {
  const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  notices = [...notices, { id, message, level, at: Date.now() }];
  listeners.forEach((l) => l());
  setTimeout(() => removeNotice(id), 5_000);
  return id;
}
export const notifySuccess = (m: string) => emitNotice(m, "success");
export const notifyError = (m: string) => emitNotice(m, "error");

export function removeNotice(id: string) {
  notices = notices.filter((n) => n.id !== id);
  listeners.forEach((l) => l());
}

export function subscribeNotices(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Snapshot of current notices (for tests). */
export function getNotices(): Notice[] {
  return notices;
}
