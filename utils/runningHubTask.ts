import { proxyRunningHubOutputs, proxyRunningHubRun } from './apiClient';
import { delay, throwIfCancelled } from './asyncControl';
import {
  extractRunningHubTaskId,
  getRunningHubFailureMessage,
  isRunningHubSuccessStatus,
  isRunningHubTaskRunning
} from './runningHubResult';
import { logger } from './logger';

export interface RunningHubTaskOptions<T> {
  apiKey: string;
  runBody: unknown;
  signal?: AbortSignal;
  maxAttempts?: number;
  initialDelayMs?: number;
  getPollIntervalMs?: (attempt: number) => number;
  extractResult: (response: any) => T | null;
  logPrefix: string;
}

export async function runRunningHubTask<T>({
  apiKey,
  runBody,
  signal,
  maxAttempts = 200,
  initialDelayMs = 0,
  getPollIntervalMs = () => 2000,
  extractResult,
  logPrefix
}: RunningHubTaskOptions<T>): Promise<T> {
  throwIfCancelled(signal);

  const executeData = await proxyRunningHubRun(apiKey, runBody, { signal });
  if (executeData.code !== 0) {
    throw new Error(`RunningHub API error: ${executeData.msg || 'Unknown error'}`);
  }

  logger.debug(`[${logPrefix}] RunningHub 任务提交成功`, executeData);

  const directResult = extractResult(executeData);
  if (directResult) return directResult;

  const taskId = extractRunningHubTaskId(executeData);
  if (!taskId) {
    throw new Error('RunningHub 未返回任务 ID');
  }

  if (initialDelayMs > 0) {
    await delay(initialDelayMs, signal);
  }

  logger.info(`[${logPrefix}] 开始轮询 RunningHub 任务`);
  let attempts = 0;
  let consecutiveErrors = 0;
  let lastStatus = '';

  while (attempts < maxAttempts) {
    throwIfCancelled(signal);

    try {
      const queryData = await proxyRunningHubOutputs(apiKey, taskId, { signal });
      consecutiveErrors = 0;

      const currentStatus = `code:${queryData.code},status:${queryData.data?.status || queryData.data?.taskStatus || 'N/A'}`;
      if (attempts % 10 === 0 || currentStatus !== lastStatus) {
        logger.debug(`[${logPrefix}] 轮询第 ${attempts + 1} 次：${currentStatus}`, queryData);
        lastStatus = currentStatus;
      }

      if (isRunningHubTaskRunning(queryData)) {
        attempts++;
        await delay(getPollIntervalMs(attempts), signal);
        continue;
      }

      const failureMessage = getRunningHubFailureMessage(queryData);
      if (failureMessage) throw new Error(`任务状态错误: ${failureMessage}`);

      if (queryData.code === 0 && queryData.data) {
        const result = extractResult(queryData);
        if (result) return result;

        if (isRunningHubSuccessStatus(queryData)) {
          logger.debug(`[${logPrefix}] 任务已成功但暂未解析到结果，继续等待`);
        }
      } else if (queryData.code !== 804) {
        logger.warn(`[${logPrefix}] 未知 RunningHub 返回码 ${queryData.code}: ${queryData.msg}`);
      }
    } catch (error: any) {
      const message = error?.message || '';
      if (message.includes('生成失败') || message.includes('内容审核') || message.includes('任务状态错误') || message.includes('安审失败')) {
        throw error;
      }

      consecutiveErrors++;
      logger.warn(`[${logPrefix}] 轮询第 ${attempts + 1} 次失败`, error);
      if (consecutiveErrors >= 15) throw error;
    }

    attempts++;
    await delay(getPollIntervalMs(attempts), signal);
  }

  await delay(5000, signal);
  const finalData = await proxyRunningHubOutputs(apiKey, taskId, { signal });
  logger.debug(`[${logPrefix}] 最终查询返回`, finalData);
  const finalResult = extractResult(finalData);
  if (finalResult) return finalResult;

  throw new Error(`RunningHub 任务超时（${attempts}次轮询）。任务可能仍在服务器处理中。\n任务ID: ${taskId}`);
}
