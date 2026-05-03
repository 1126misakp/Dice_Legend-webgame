/**
 * RunningHub API 任务队列管理器
 * 确保同一 API Key 同时只有一个任务在运行
 */
import { logger } from './logger';
import { createCancelledError, delay } from './asyncControl';

type TaskFunction = () => Promise<void>;

interface QueueOptions {
  signal?: AbortSignal;
}

interface QueuedTask {
  id: string;
  execute: TaskFunction;
  resolve: () => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
}

class RunningHubQueue {
  private static instance: RunningHubQueue;
  private queue: QueuedTask[] = [];
  private isProcessing: boolean = false;
  private currentTaskId: string | null = null;

  private constructor() {}

  static getInstance(): RunningHubQueue {
    if (!RunningHubQueue.instance) {
      RunningHubQueue.instance = new RunningHubQueue();
    }
    return RunningHubQueue.instance;
  }

  /**
   * 获取队列状态
   */
  getStatus(): { isProcessing: boolean; queueLength: number; currentTaskId: string | null } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.queue.length,
      currentTaskId: this.currentTaskId,
    };
  }

  /**
   * 获取任务在队列中的位置 (0 = 正在执行, 1+ = 等待中)
   */
  getPosition(taskId: string): number {
    if (this.currentTaskId === taskId) return 0;
    const idx = this.queue.findIndex(t => t.id === taskId);
    return idx >= 0 ? idx + 1 : -1;
  }

  /**
   * 添加任务到队列
   * @param taskId 任务唯一标识符
   * @param execute 任务执行函数
   * @returns Promise，在任务完成时 resolve
   */
  async enqueue(taskId: string, execute: TaskFunction, options: QueueOptions = {}): Promise<void> {
    if (options.signal?.aborted) {
      throw createCancelledError('任务已取消');
    }

    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id: taskId,
        execute,
        resolve,
        reject,
        signal: options.signal,
      };

      task.onAbort = () => {
        const removed = this.cancel(taskId);
        if (!removed && this.currentTaskId === taskId) {
          logger.debug(`[Queue] 执行中的任务 ${taskId} 收到取消信号`);
        }
      };
      options.signal?.addEventListener('abort', task.onAbort, { once: true });

      this.queue.push(task);
      logger.debug(`[Queue] 任务 ${taskId} 已加入队列，当前长度 ${this.queue.length}`);

      // 如果没有正在处理的任务，开始处理
      if (!this.isProcessing) {
        this.processNext();
      }
    });
  }

  /**
   * 处理队列中的下一个任务
   */
  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      this.currentTaskId = null;
      logger.debug('[Queue] 队列已空闲');
      return;
    }

    this.isProcessing = true;
    const task = this.queue.shift()!;
    this.currentTaskId = task.id;
    if (task.onAbort) {
      task.signal?.removeEventListener('abort', task.onAbort);
      task.onAbort = undefined;
    }

    logger.debug(`[Queue] 开始处理任务 ${task.id}，剩余 ${this.queue.length}`);

    try {
      if (task.signal?.aborted) {
        throw createCancelledError('任务已取消');
      }
      await task.execute();
      task.resolve();
    } catch (error) {
      task.reject(error as Error);
    } finally {
      // 等待一小段时间确保 API 释放资源
      await delay(2000).catch(() => undefined);
      // 处理下一个任务
      this.processNext();
    }
  }

  /**
   * 取消队列中等待的任务（不能取消正在执行的任务）
   */
  cancel(taskId: string): boolean {
    const idx = this.queue.findIndex(t => t.id === taskId);
    if (idx >= 0) {
      const task = this.queue.splice(idx, 1)[0];
      if (task.onAbort) {
        task.signal?.removeEventListener('abort', task.onAbort);
      }
      task.reject(createCancelledError('任务已取消'));
      logger.debug(`[Queue] 任务 ${taskId} 已取消`);
      return true;
    }
    return false;
  }

  /**
   * 清空队列（不影响正在执行的任务）
   */
  clearQueue(): void {
    this.queue.forEach(task => {
      if (task.onAbort) {
        task.signal?.removeEventListener('abort', task.onAbort);
      }
      task.reject(createCancelledError('队列已清空'));
    });
    this.queue = [];
    logger.debug('[Queue] 队列已清空');
  }
}

// 导出单例
export const runningHubQueue = RunningHubQueue.getInstance();

// 导出便捷函数
export function getQueueStatus() {
  return runningHubQueue.getStatus();
}

export function getTaskPosition(taskId: string) {
  return runningHubQueue.getPosition(taskId);
}
