/**
 * 按钮点击音效 Hook
 * 为按钮添加点击音效反馈
 */

import { useCallback } from 'react';
import { audioService } from '../services/audioService';

/**
 * 创建带有音效的点击处理器
 * @param onClick 原始点击处理函数
 * @returns 包装后的点击处理函数（会先播放音效）
 */
export function useButtonSound<T extends (...args: unknown[]) => unknown>(
  onClick?: T
): T | (() => void) {
  const handleClick = useCallback((...args: Parameters<T>) => {
    // 播放UI点击音效
    audioService.play('ui_click');
    
    // 调用原始处理函数
    if (onClick) {
      return onClick(...args);
    }
  }, [onClick]) as T;

  return onClick ? handleClick : () => audioService.play('ui_click');
}

/**
 * 直接播放UI点击音效
 * 用于不需要包装处理函数的场景
 */
export function playClickSound(): void {
  audioService.play('ui_click');
}

export default useButtonSound;
