export interface ApiKeys {
  openRouter: string;
  openRouterModel: string;
  runningHub: string;
  miniMax: string;
}

export interface ApiCapabilities {
  openRouter: boolean;
  runningHub: boolean;
  miniMax: boolean;
}

const STORAGE_KEY = 'diceLegend.apiKeys.v1';
export const DEFAULT_OPENROUTER_MODEL = 'x-ai/grok-4.1-fast';

export const emptyApiKeys: ApiKeys = {
  openRouter: '',
  openRouterModel: DEFAULT_OPENROUTER_MODEL,
  runningHub: '',
  miniMax: ''
};

function normalizeKeys(value: Partial<ApiKeys> | null | undefined): ApiKeys {
  return {
    openRouter: value?.openRouter?.trim() ?? '',
    openRouterModel: value?.openRouterModel?.trim() || DEFAULT_OPENROUTER_MODEL,
    runningHub: value?.runningHub?.trim() ?? '',
    miniMax: value?.miniMax?.trim() ?? ''
  };
}

export function loadApiKeys(): ApiKeys {
  if (typeof window === 'undefined') return emptyApiKeys;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyApiKeys;
    return normalizeKeys(JSON.parse(raw));
  } catch {
    return emptyApiKeys;
  }
}

export function saveApiKeys(keys: ApiKeys): ApiKeys {
  const normalized = normalizeKeys(keys);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearApiKeys(): ApiKeys {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return emptyApiKeys;
}

export function getApiCapabilities(keys: ApiKeys): ApiCapabilities {
  return {
    openRouter: keys.openRouter.trim().length > 0,
    runningHub: keys.runningHub.trim().length > 0,
    miniMax: keys.miniMax.trim().length > 0
  };
}
