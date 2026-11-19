// The reply inbox's rules in one place, shared by the API and its tests.
export const INBOX_WINDOW_DAYS = 60; // reviews older than this are not nagged about
export const STATS_WINDOW_DAYS = 30;
export const MAX_BULK_DRAFTS = 5;
export const MAX_OPEN = 50;
export const HANDLED = ["replied", "skipped"]; // what a person can mark ("store" is set by the store itself)

// 1-3 star reviews with some text: the ones worth answering. (A bare star rating has nothing to reply to.)
export const needsReply = (r) => Number(r.rating) >= 1 && Number(r.rating) <= 3 && `${r.title ?? ""}${r.content ?? ""}`.trim().length > 0;

export function replyStats({ lowTotal, repliedCount, skippedCount, medianSeconds }) {
  const answerable = Math.max(0, lowTotal - skippedCount);
  return {
    windowDays: STATS_WINDOW_DAYS,
    lowTotal,
    replied: repliedCount,
    rate: answerable > 0 ? Math.round((repliedCount / answerable) * 100) : null,
    medianHours: medianSeconds == null ? null : Math.round((Number(medianSeconds) / 3600) * 10) / 10,
  };
}
