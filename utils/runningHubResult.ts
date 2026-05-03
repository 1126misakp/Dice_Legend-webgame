const IMAGE_EXT_RE = /\.(jpeg|jpg|png|webp|gif|bmp|svg)(\?.*)?$/i;
const VIDEO_EXT_RE = /\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i;
const FAILURE_STATUSES = new Set([
  'FAILURE',
  'FAILED',
  'ERROR',
  'CANCELLED',
  'CANCELED',
  'TIMEOUT',
  'REJECTED',
  'ABORTED',
  'EXCEPTION'
]);
const SUCCESS_STATUSES = new Set(['SUCCESS', 'COMPLETED', 'SUCCEED']);

export function extractRunningHubTaskId(response: unknown): string | null {
  const data = getRecordValue(response, 'data');
  if (typeof data === 'string' && data.length > 5) return data;
  if (isRecord(data) && data.taskId) return String(data.taskId);
  if (isRecord(data) && data.task_id) return String(data.task_id);
  return null;
}

export function extractRunningHubImageUrl(response: unknown): string | null {
  return collectHttpUrls(response).find(isImageUrl) || null;
}

export function extractRunningHubVideoUrl(response: unknown, sourceImageUrl?: string): string | null {
  const candidates = collectHttpUrls(response).filter(url => {
    if (sourceImageUrl && url === sourceImageUrl) return false;
    if (url.includes('/input/')) return false;
    return true;
  });

  return (
    candidates.find(url => url.includes('/output/') && isVideoUrl(url)) ||
    candidates.find(isVideoUrl) ||
    candidates.find(url => url.includes('/output/') && !isImageUrl(url) && /video|mp4|live/i.test(url)) ||
    candidates.find(url => url.includes('/output/') && !isImageUrl(url)) ||
    candidates.find(url => !isImageUrl(url)) ||
    null
  );
}

export function isRunningHubTaskRunning(response: unknown): boolean {
  return getRecordValue(response, 'code') === 804 || getRecordValue(response, 'msg') === 'APIKEY_TASK_IS_RUNNING';
}

export function isRunningHubSuccessStatus(response: unknown): boolean {
  const status = getRunningHubStatus(response);
  return status ? SUCCESS_STATUSES.has(status) : false;
}

export function getRunningHubFailureMessage(response: unknown): string | null {
  const status = getRunningHubStatus(response);
  if (status && FAILURE_STATUSES.has(status)) {
    const msg = getRecordValue(response, 'msg');
    return getFirstErrorText(getRecordValue(response, 'data')) || (typeof msg === 'string' ? msg : null) || `任务状态错误：${status}`;
  }

  if (getRecordValue(response, 'code') === 805) {
    const msg = getRecordValue(response, 'msg');
    return getAuditOrErrorText(getRecordValue(response, 'data')) || (typeof msg === 'string' ? msg : null) || '任务状态错误';
  }

  return getAuditOrErrorText(getRecordValue(response, 'data'));
}

function getRunningHubStatus(response: unknown): string {
  const data = getRecordValue(response, 'data');
  const status = getRecordValue(data, 'status') || getRecordValue(data, 'taskStatus');
  return status ? String(status).toUpperCase() : '';
}

function isImageUrl(url: string): boolean {
  return IMAGE_EXT_RE.test(url);
}

function isVideoUrl(url: string): boolean {
  return VIDEO_EXT_RE.test(url);
}

function collectHttpUrls(value: unknown): string[] {
  const urls: string[] = [];
  const visited = new Set<unknown>();

  const walk = (node: unknown) => {
    if (!node) return;

    if (typeof node === 'string') {
      if (node.startsWith('http')) urls.push(node);
      return;
    }

    if (typeof node !== 'object') return;
    if (visited.has(node)) return;
    visited.add(node);

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    const record = node as Record<string, unknown>;
    const priorityKeys = ['fileUrl', 'imgUrl', 'imageUrl', 'videoUrl', 'url', 'outputUrl', 'output', 'result', 'video', 'file'];
    for (const key of priorityKeys) {
      if (record[key] !== undefined) walk(record[key]);
    }
    for (const [key, child] of Object.entries(record)) {
      if (!priorityKeys.includes(key)) walk(child);
    }
  };

  walk(value);
  return urls;
}

function getAuditOrErrorText(data: unknown): string | null {
  const text = getFirstErrorText(data);
  if (!text) return null;

  const lowered = text.toLowerCase();
  if (
    lowered.includes('porn') ||
    lowered.includes('nsfw') ||
    lowered.includes('forbidden') ||
    lowered.includes('blocked') ||
    lowered.includes('rejected') ||
    lowered.includes('censored') ||
    lowered.includes('inappropriate') ||
    lowered.includes('policy') ||
    lowered.includes('moderation') ||
    text.includes('安审') ||
    text.includes('审核') ||
    text.includes('违规') ||
    text.includes('敏感') ||
    text.includes('失败') ||
    lowered.includes('fail') ||
    lowered.includes('error')
  ) {
    return text;
  }

  return null;
}

function getFirstErrorText(data: unknown): string | null {
  if (!isRecord(data)) return null;

  const errorFields = ['exception_message', 'errorMsg', 'error', 'message', 'msg', 'reason', 'failReason'];
  for (const field of errorFields) {
    const value = data[field];
    if (typeof value === 'string' && value.trim()) return value;
  }

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      const nested = getFirstErrorText(item);
      if (nested) return nested;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getRecordValue(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}
