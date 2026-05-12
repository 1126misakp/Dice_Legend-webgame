export interface ApiKeys {
  openRouter: string;
  openRouterModel: string;
  runningHub: string;
  mimo: string;
  mimoVoice: string;
  mimoKeyMode: MimoKeyMode;
  textProvider: TextProvider;
}

export interface ApiCapabilities {
  openRouter: boolean;
  runningHub: boolean;
  mimo: boolean;
  text: boolean;
}

export type TextProvider = 'mimo' | 'openRouter';
export type MimoKeyMode = 'tokenPlan' | 'voiceApi';

const STORAGE_KEY = 'diceLegend.apiKeys.v1';
export const DEFAULT_OPENROUTER_MODEL = 'x-ai/grok-4.1-fast';
export const DEFAULT_TEXT_PROVIDER: TextProvider = 'mimo';
export const DEFAULT_MIMO_KEY_MODE: MimoKeyMode = 'tokenPlan';

export const emptyApiKeys: ApiKeys = {
  openRouter: '',
  openRouterModel: DEFAULT_OPENROUTER_MODEL,
  runningHub: '',
  mimo: '',
  mimoVoice: '',
  mimoKeyMode: DEFAULT_MIMO_KEY_MODE,
  textProvider: DEFAULT_TEXT_PROVIDER
};

type StoredApiKeys = Partial<ApiKeys> & {
  miniMax?: string;
};

function normalizeKeys(value: StoredApiKeys | null | undefined): ApiKeys {
  const textProvider = value?.textProvider === 'openRouter' ? 'openRouter' : DEFAULT_TEXT_PROVIDER;
  const mimoKeyMode = value?.mimoKeyMode === 'voiceApi' ? 'voiceApi' : DEFAULT_MIMO_KEY_MODE;

  return {
    openRouter: value?.openRouter?.trim() ?? '',
    openRouterModel: value?.openRouterModel?.trim() || DEFAULT_OPENROUTER_MODEL,
    runningHub: value?.runningHub?.trim() ?? '',
    mimo: value?.mimo?.trim() || value?.miniMax?.trim() || '',
    mimoVoice: value?.mimoVoice?.trim() ?? '',
    mimoKeyMode,
    textProvider
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
  const openRouter = keys.openRouter.trim().length > 0;
  const tokenPlanMimo = keys.mimo.trim().length > 0;
  const officialMimoVoice = keys.mimoVoice.trim().length > 0;
  const mimo = keys.textProvider === 'openRouter' || keys.mimoKeyMode === 'voiceApi'
    ? officialMimoVoice
    : tokenPlanMimo;
  const mimoText = keys.mimoKeyMode === 'voiceApi' ? officialMimoVoice : tokenPlanMimo;

  return {
    openRouter,
    runningHub: keys.runningHub.trim().length > 0,
    mimo,
    text: keys.textProvider === 'openRouter' ? openRouter : mimoText
  };
}
