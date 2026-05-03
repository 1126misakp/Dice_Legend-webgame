import { MouseEvent, useCallback, useEffect, useRef, useState } from 'react';
import { CharacterInfo } from '../types';
import { ApiCapabilities, ApiKeys, DEFAULT_OPENROUTER_MODEL } from '../utils/apiKeyStore';
import { proxyOpenRouterChat } from '../utils/apiClient';
import { getQueueStatus, runningHubQueue } from '../utils/runningHubQueue';
import { buildFallbackLivePrompt, buildLivePromptUserText, LIVE_SYSTEM_PROMPT } from '../utils/promptTemplates';
import { extractRunningHubVideoUrl } from '../utils/runningHubResult';
import { runRunningHubTask } from '../utils/runningHubTask';
import { isCancelledError } from '../utils/asyncControl';
import { logger } from '../utils/logger';

interface UseLiveGenerationOptions {
  info: CharacterInfo;
  apiKeys: ApiKeys;
  capabilities: ApiCapabilities;
}

export function useLiveGeneration({ info, apiKeys, capabilities }: UseLiveGenerationOptions) {
  const [videoUrl, setVideoUrl] = useState<string | null>(info.videoUrl || null);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isLiveGenerating, setIsLiveGenerating] = useState(false);
  const [showLiveConfirm, setShowLiveConfirm] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentQueueStatus = getQueueStatus();
  const pendingQueueCount = currentQueueStatus.queueLength + (currentQueueStatus.isProcessing ? 1 : 0);

  useEffect(() => {
    setVideoUrl(info.videoUrl || null);
  }, [info.videoUrl]);

  const cancelLiveGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const buildLiveAnimationPrompt = useCallback(async (signal: AbortSignal): Promise<string> => {
    const characterInfoText = buildLivePromptUserText(info);

    try {
      if (!capabilities.openRouter || !apiKeys.openRouter.trim()) {
        throw new Error('未配置 OpenRouter API Key');
      }

      const grokData = await proxyOpenRouterChat(apiKeys.openRouter, {
        model: apiKeys.openRouterModel || DEFAULT_OPENROUTER_MODEL,
        messages: [
          { role: 'system', content: LIVE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: info.imageUrl }
              },
              {
                type: 'text',
                text: characterInfoText
              }
            ]
          }
        ],
        max_tokens: 10000,
        temperature: 0.8
      }, { signal });

      const rawContent = grokData.choices?.[0]?.message?.content || '';
      const cleanedContent = rawContent.replace(/```[\s\S]*?```/g, '').replace(/`/g, '').trim();
      const storyboardMatch = cleanedContent.match(/(?:###\s*动态脚本设计[^\n]*\n?(?:\(Action Storyboard\)\n?)?|【动态脚本】|\[动态脚本\])\s*([\s\S]*?)(?=###\s*AI Video Prompt|【Video Prompt】|\[Video Prompt\]|$)/i);

      if (storyboardMatch?.[1]?.trim()) {
        return storyboardMatch[1].trim();
      }

      const lines = cleanedContent.split('\n');
      const chineseLines: string[] = [];
      let foundChinese = false;

      for (const line of lines) {
        const hasChinese = /[\u4e00-\u9fa5]/.test(line);
        const isTitle = /^[#\[【]/.test(line.trim());
        const isEnglishPrompt = /^[\(\[]?[a-zA-Z]/.test(line.trim()) && !hasChinese;

        if (hasChinese && !isTitle) {
          foundChinese = true;
          chineseLines.push(line.trim());
        } else if (foundChinese && isEnglishPrompt) {
          break;
        }
      }

      const chineseScript = chineseLines.join('');
      if (!chineseScript || chineseScript.length < 20) {
        logger.warn('[Live] 未能提取中文动态脚本，使用完整返回内容');
        return cleanedContent;
      }

      logger.debug('[Live] 动态脚本提取完成', chineseScript);
      return chineseScript;
    } catch (error) {
      if (isCancelledError(error)) throw error;
      logger.warn('[Live] OpenRouter 动态提示词失败，使用本地兜底', error);
      return buildFallbackLivePrompt(info.rarity);
    }
  }, [apiKeys.openRouter, apiKeys.openRouterModel, capabilities.openRouter, info]);

  const executeVideoGeneration = useCallback(async (signal: AbortSignal) => {
    logger.info('[Live] 开始生成动态化提示词');
    const liveAnimationPrompt = await buildLiveAnimationPrompt(signal);
    logger.info('[Live] 提交 RunningHub 动态化任务');

    const videoResultUrl = await runRunningHubTask<string>({
      apiKey: apiKeys.runningHub,
      signal,
      logPrefix: 'Live',
      initialDelayMs: 3000,
      maxAttempts: 200,
      getPollIntervalMs: (attempt) => attempt < 50 ? 3000 : 5000,
      runBody: {
        webappId: '2004562821612535810',
        nodeInfoList: [
          {
            nodeId: '45',
            fieldName: 'text',
            fieldValue: liveAnimationPrompt,
            description: 'LIVE动画完整提示词'
          },
          {
            nodeId: '46',
            fieldName: 'text',
            fieldValue: info.name.split('·')[0],
            description: '角色姓名'
          },
          {
            nodeId: '39',
            fieldName: 'url',
            fieldValue: info.imageUrl,
            description: '角色立绘'
          }
        ]
      },
      extractResult: (response) => extractRunningHubVideoUrl(response, info.imageUrl)
    });

    logger.info('[Live] 动态化视频生成成功');
    setVideoUrl(videoResultUrl);
    setIsLiveActive(true);
    info.videoUrl = videoResultUrl;
  }, [apiKeys.runningHub, buildLiveAnimationPrompt, info]);

  const generateLiveVideo = useCallback(async () => {
    if (!capabilities.runningHub || !apiKeys.runningHub.trim()) {
      alert('未配置 RunningHub API Key，无法生成动态化视频。');
      return;
    }
    if (!info.imageUrl) {
      alert('当前角色没有立绘，无法生成动态化视频。');
      return;
    }

    cancelLiveGeneration();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setShowLiveConfirm(false);
    setIsLiveGenerating(true);

    const localQueueId = `live-${info.name}-${Date.now()}`;
    const status = getQueueStatus();
    if (status.isProcessing || status.queueLength > 0) {
      setQueuePosition(status.queueLength + 1);
      logger.debug(`[Live] 动态化任务排队，位置 ${status.queueLength + 1}`);
    }

    try {
      await runningHubQueue.enqueue(localQueueId, async () => {
        setQueuePosition(0);
        logger.debug(`[Live] 动态化任务 ${localQueueId} 开始执行`);
        await executeVideoGeneration(signal);
      }, { signal });
    } catch (error: any) {
      if (!isCancelledError(error)) {
        logger.error('[Live] 动态化生成失败', error);
        alert(`动态化生成失败: ${error.message || '请稍后重试'}`);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLiveGenerating(false);
      setQueuePosition(0);
    }
  }, [apiKeys.runningHub, capabilities.runningHub, cancelLiveGeneration, executeVideoGeneration, info.imageUrl, info.name]);

  const handleLiveClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
    if (isLiveGenerating) return;

    if (!videoUrl) {
      setShowLiveConfirm(true);
    } else {
      setIsLiveActive(current => !current);
    }
  }, [isLiveGenerating, videoUrl]);

  useEffect(() => cancelLiveGeneration, [cancelLiveGeneration]);

  return {
    videoUrl,
    isLiveActive,
    isLiveGenerating,
    showLiveConfirm,
    queuePosition,
    pendingQueueCount,
    setShowLiveConfirm,
    generateLiveVideo,
    handleLiveClick,
    cancelLiveGeneration
  };
}
