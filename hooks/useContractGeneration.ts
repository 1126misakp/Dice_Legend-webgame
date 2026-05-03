import { useCallback, useEffect, useRef, useState } from 'react';
import { CharacterInfo, DiceResult } from '../types';
import { ApiCapabilities, ApiKeys } from '../utils/apiKeyStore';
import { ApiClientError } from '../utils/apiClient';
import { getQueueStatus, runningHubQueue } from '../utils/runningHubQueue';
import { generateCharacterVoices } from '../services/voiceService';
import { generateFallbackInfo } from '../logic/gameLogic';
import {
  generateContractCharacterInfo,
  generateContractImagePrompt,
  generateContractImageUrl,
  preloadImage
} from '../services/contractService';
import { buildEmergencyImagePrompt } from '../utils/promptTemplates';
import { delay, isCancelledError } from '../utils/asyncControl';
import { logger } from '../utils/logger';

interface UseContractGenerationOptions {
  apiKeys: ApiKeys;
  capabilities: ApiCapabilities;
  openRouterModel: string;
  onCharacterReady: (info: CharacterInfo) => void;
  onVoiceReady: (info: CharacterInfo) => void;
  onApiError: (message: string) => void;
  onImageFailure: () => void;
  onReturnToContractPending: () => void;
}

export function useContractGeneration({
  apiKeys,
  capabilities,
  openRouterModel,
  onCharacterReady,
  onVoiceReady,
  onApiError,
  onImageFailure,
  onReturnToContractPending
}: UseContractGenerationOptions) {
  const [loadingText, setLoadingText] = useState('命运编织中...');
  const [visualProgress, setVisualProgress] = useState(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startProgressAnimation = useCallback(() => {
    setVisualProgress(0);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

    const startTime = Date.now();
    const duration = 90000;
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setVisualProgress(Math.min((elapsed / duration) * 100, 99));
    }, 100);
  }, []);

  const stopProgressAnimation = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setVisualProgress(100);
  }, []);

  const resetProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setVisualProgress(0);
  }, []);

  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    resetProgress();
  }, [resetProgress]);

  const generateContract = useCallback(async (result: DiceResult, stylePrompt: string) => {
    cancelGeneration();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setLoadingText('正在撰写命运篇章...');
    setVisualProgress(0);

    let generatedInfo: CharacterInfo;
    try {
      generatedInfo = await generateContractCharacterInfo(result, stylePrompt, {
        apiKeys,
        capabilities,
        openRouterModel,
        signal
      });
    } catch (error: any) {
      logger.warn('[CharacterInfo] 生成失败', error);
      if (isCancelledError(error)) return;

      if (error instanceof ApiClientError && error.code === 'REQUEST_TIMEOUT') {
        setLoadingText('角色信息生成超时，正在返回...');
        await delay(1500).catch(() => undefined);
        onReturnToContractPending();
        return;
      }

      if (error instanceof ApiClientError) {
        onApiError(`角色信息生成失败\n\n错误详情：${error.message}`);
        return;
      }

      generatedInfo = generateFallbackInfo(result, stylePrompt);
    }

    let voiceGenerationPromise: Promise<any> | null = null;
    if (capabilities.miniMax) {
      logger.info('[Voice] 开始并行生成角色语音');
      voiceGenerationPromise = generateCharacterVoices(generatedInfo, apiKeys, (current, total, skillType) => {
        logger.debug(`[Voice] 生成进度: ${current}/${total} - ${skillType}`);
      }).catch(error => {
        logger.error('[Voice] 语音生成异常', error);
        return { success: false, error: error.message };
      });
    } else {
      logger.warn('[Voice] 未配置 MiniMax API Key，跳过语音生成');
    }

    setLoadingText('灵魂连接中...');
    let imagePrompt = '';
    try {
      imagePrompt = await generateContractImagePrompt(generatedInfo, {
        apiKeys,
        capabilities,
        openRouterModel,
        signal
      });
    } catch (error: any) {
      logger.warn('[ImagePrompt] 生成失败', error);
      if (isCancelledError(error)) return;

      if (error instanceof ApiClientError && error.code === 'REQUEST_TIMEOUT') {
        setLoadingText('立绘提示词生成超时，正在返回...');
        await delay(1500).catch(() => undefined);
        onReturnToContractPending();
        return;
      }

      if (error instanceof ApiClientError) {
        onApiError(`立绘提示词生成失败\n\n错误详情：${error.message}`);
        return;
      }

      imagePrompt = buildEmergencyImagePrompt(generatedInfo);
    }

    const finalizeCharacter = async (info: CharacterInfo) => {
      onCharacterReady(info);

      if (voiceGenerationPromise) {
        logger.info('[Voice] 等待语音生成完成');
        const voiceResult = await voiceGenerationPromise;
        if (voiceResult?.success && voiceResult?.data) {
          logger.info('[Voice] 语音生成成功');
          onVoiceReady({ ...info, voices: voiceResult.data });
        } else {
          logger.warn('[Voice] 语音生成失败', voiceResult?.error);
        }
      }
    };

    if (!capabilities.runningHub) {
      logger.warn('[RunningHub] 未配置 RunningHub API Key，跳过立绘生成');
      stopProgressAnimation();
      setLoadingText('未配置立绘服务，展示文字契约...');
      await delay(800, signal).catch(() => undefined);
      if (!signal.aborted) await finalizeCharacter(generatedInfo);
      return;
    }

    const queueStatus = getQueueStatus();
    if (queueStatus.isProcessing || queueStatus.queueLength > 0) {
      const waitCount = queueStatus.queueLength + (queueStatus.isProcessing ? 1 : 0);
      setLoadingText(`契约编撰中...前方${waitCount}个灵魂`);
      logger.debug(`[Static] 静态立绘任务等待队列，位置 ${queueStatus.queueLength + 1}`);
    }

    const staticQueueId = `static-${generatedInfo.name}-${Date.now()}`;
    try {
      await runningHubQueue.enqueue(staticQueueId, async () => {
        setLoadingText('灵魂连接中...');
        startProgressAnimation();
        const imageUrl = await generateContractImageUrl(apiKeys.runningHub, generatedInfo, imagePrompt, signal);

        stopProgressAnimation();
        generatedInfo.imageUrl = imageUrl;
        setLoadingText('正在显影...');
        await preloadImage(imageUrl, signal);
        if (!signal.aborted) await finalizeCharacter(generatedInfo);
      }, { signal });
    } catch (error) {
      stopProgressAnimation();
      if (isCancelledError(error)) return;

      logger.warn('[Static] 立绘生成失败', error);
      onImageFailure();
      setLoadingText('召唤失败，请重试...');
      await delay(1500).catch(() => undefined);
      onReturnToContractPending();
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [
    apiKeys,
    capabilities,
    cancelGeneration,
    onApiError,
    onCharacterReady,
    onImageFailure,
    onReturnToContractPending,
    onVoiceReady,
    openRouterModel,
    startProgressAnimation,
    stopProgressAnimation
  ]);

  useEffect(() => cancelGeneration, [cancelGeneration]);

  return {
    loadingText,
    visualProgress,
    generateContract,
    cancelGeneration,
    resetProgress
  };
}
