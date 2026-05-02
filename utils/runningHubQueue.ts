/**
 * RunningHub API 任务队列管理器
 * 确保同一 API Key 同时只有一个任务在运行
 */

type TaskFunction = () => Promise<void>;

interface QueuedTask {
  id: string;
  execute: TaskFunction;
  resolve: () => void;
  reject: (error: Error) => void;
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
  async enqueue(taskId: string, execute: TaskFunction): Promise<void> {
    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id: taskId,
        execute,
        resolve,
        reject,
      };

      this.queue.push(task);
      console.log(`[Queue] Task ${taskId} added. Queue length: ${this.queue.length}`);

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
      console.log('[Queue] Queue empty, idle.');
      return;
    }

    this.isProcessing = true;
    const task = this.queue.shift()!;
    this.currentTaskId = task.id;

    console.log(`[Queue] Processing task ${task.id}. Remaining: ${this.queue.length}`);

    try {
      await task.execute();
      task.resolve();
    } catch (error) {
      task.reject(error as Error);
    } finally {
      // 等待一小段时间确保 API 释放资源
      await new Promise(r => setTimeout(r, 2000));
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
      task.reject(new Error('Task cancelled'));
      console.log(`[Queue] Task ${taskId} cancelled.`);
      return true;
    }
    return false;
  }

  /**
   * 清空队列（不影响正在执行的任务）
   */
  clearQueue(): void {
    this.queue.forEach(task => {
      task.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    console.log('[Queue] Queue cleared.');
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

