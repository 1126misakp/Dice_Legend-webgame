import { CharacterInfo, DiceResult } from '../types';
import { generateFallbackInfo } from '../logic/gameLogic';
import { ApiCapabilities, ApiKeys } from '../utils/apiKeyStore';
import { proxyOpenRouterChat } from '../utils/apiClient';
import {
  buildCharacterInfoPrompts,
  buildEmergencyImagePrompt,
  buildImagePromptUserInput,
  buildLocalImagePrompt,
  ILLUSTRATOR_SYSTEM_PROMPT
} from '../utils/promptTemplates';
import { extractRunningHubImageUrl } from '../utils/runningHubResult';
import { runRunningHubTask } from '../utils/runningHubTask';
import { logger } from '../utils/logger';
import { delay } from '../utils/asyncControl';

interface ContractGenerationContext {
  apiKeys: ApiKeys;
  capabilities: ApiCapabilities;
  openRouterModel: string;
  signal?: AbortSignal;
}

export async function generateContractCharacterInfo(
  result: DiceResult,
  stylePrompt: string,
  context: ContractGenerationContext
): Promise<CharacterInfo> {
  const { apiKeys, capabilities, openRouterModel, signal } = context;
  const { systemPrompt, userPrompt } = buildCharacterInfoPrompts(result, stylePrompt);

  if (!capabilities.openRouter) {
    logger.warn('[CharacterInfo] 未配置 OpenRouter API Key，使用本地角色文案兜底');
    return generateFallbackInfo(result, stylePrompt);
  }

  logger.info('[CharacterInfo] 开始生成角色文案');
  const data = await proxyOpenRouterChat(apiKeys.openRouter, {
    model: openRouterModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_tokens: 10000,
    temperature: 0.8
  }, { signal });

  const content = data.choices[0].message.content;
  const cleanedContent = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const aiData = JSON.parse(cleanedContent);

  logger.info('[CharacterInfo] 角色文案生成成功');
  return {
    ...aiData,
    style: stylePrompt,
    gender: '女',
    age: result.age,
    profession: result.profession,
    race: result.race.name,
    attribute: result.attribute,
    rarity: result.rarity
  };
}

export async function generateContractImagePrompt(
  info: CharacterInfo,
  context: ContractGenerationContext
): Promise<string> {
  const { apiKeys, capabilities, openRouterModel, signal } = context;
  const characterInfoForPrompt = buildImagePromptUserInput(info);

  if (!capabilities.openRouter) {
    logger.warn('[ImagePrompt] 未配置 OpenRouter API Key，使用本地立绘提示词');
    return buildLocalImagePrompt(info);
  }

  logger.info('[ImagePrompt] 开始生成立绘提示词');
  const openRouterData = await proxyOpenRouterChat(apiKeys.openRouter, {
    model: openRouterModel,
    messages: [
      { role: 'system', content: ILLUSTRATOR_SYSTEM_PROMPT },
      { role: 'user', content: characterInfoForPrompt }
    ],
    max_tokens: 10000,
    temperature: 0.8
  }, { signal });

  const imagePrompt = (openRouterData.choices[0]?.message?.content || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`/g, '')
    .trim();

  logger.debug('[ImagePrompt] 立绘提示词生成成功', imagePrompt);
  return imagePrompt || buildEmergencyImagePrompt(info);
}

export async function generateContractImageUrl(
  apiKey: string,
  info: CharacterInfo,
  imagePrompt: string,
  signal?: AbortSignal
): Promise<string> {
  return runRunningHubTask<string>({
    apiKey,
    signal,
    logPrefix: 'Static',
    runBody: {
      webappId: '2004539728869425154',
      nodeInfoList: [
        { nodeId: '63', fieldName: 'text', fieldValue: imagePrompt, description: '角色立绘完整提示词' },
        { nodeId: '71', fieldName: 'text', fieldValue: info.name.split('·')[0], description: '角色姓名' }
      ]
    },
    extractResult: extractRunningHubImageUrl,
    getPollIntervalMs: () => 2000
  });
}

export async function preloadImage(url: string, signal?: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }

    const img = new Image();
    const finish = () => {
      signal?.removeEventListener('abort', finish);
      resolve();
    };

    img.onload = finish;
    img.onerror = finish;
    signal?.addEventListener('abort', finish, { once: true });
    img.src = url;

    delay(5000, signal).then(finish).catch(finish);
  });
}
