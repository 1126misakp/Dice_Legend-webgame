/**
 * 音效服务 - 纹章传说
 * 使用 Web Audio API 合成音效，无需外部音效文件
 */
import { logger } from '../utils/logger';

// 音效ID枚举
export type SoundId =
  | 'dice_throw'      // 骰子投掷
  | 'dice_hit'        // 骰子碰撞
  | 'ui_click'        // UI按钮点击
  | 'summon_r'        // R稀有度召唤成功
  | 'summon_sr'       // SR稀有度召唤成功
  | 'summon_ssr'      // SSR稀有度召唤成功
  | 'summon_ur';      // UR稀有度召唤成功

// 稀有度类型
export type Rarity = 'R' | 'SR' | 'SSR' | 'UR';

// 音效音量配置
const SOUND_VOLUMES: Record<SoundId, number> = {
  dice_throw: 0.5,
  dice_hit: 0.3,
  ui_click: 0.3,
  summon_r: 0.5,
  summon_sr: 0.6,
  summon_ssr: 0.7,
  summon_ur: 0.8
};

type WebkitAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

class AudioService {
  private static instance: AudioService;
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 1.0;
  private isMuted: boolean = false;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  // 初始化音频上下文（需要用户交互后调用）
  public async init(): Promise<void> {
    if (this.isInitialized) return;
    try {
      const AudioContextCtor = window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error('当前浏览器不支持 Web Audio API');
      }
      this.audioContext = new AudioContextCtor();
      this.isInitialized = true;
      logger.info('[AudioService] Web Audio API 初始化完成');
    } catch (error) {
      logger.error('[AudioService] 初始化失败', error);
    }
  }

  // 创建振荡器音效
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.5): void {
    if (!this.audioContext || this.isMuted) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;
    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    const finalVolume = volume * this.masterVolume;
    gain.gain.setValueAtTime(finalVolume, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    osc.start();
    osc.stop(this.audioContext.currentTime + duration);
  }

  // 播放噪音音效（用于骰子）
  private playNoise(duration: number, volume: number = 0.3): void {
    if (!this.audioContext || this.isMuted) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 2000;

    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    gain.gain.value = volume * this.masterVolume;
    source.start();
  }

  // 播放和弦音效（用于召唤成功）
  private playChord(frequencies: number[], duration: number, volume: number = 0.5): void {
    if (!this.audioContext || this.isMuted) return;

    const finalVolume = (volume * this.masterVolume) / frequencies.length;

    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, duration, 'sine', finalVolume);
      }, i * 50); // 琶音效果
    });
  }

  // 播放单次骰子碰撞声（木质/塑料骰子碰撞桌面）
  private playDiceClick(delay: number, volume: number): void {
    if (!this.audioContext) return;

    setTimeout(() => {
      // 使用更高频率的短促噪音模拟骰子碰撞
      const duration = 0.02 + Math.random() * 0.015; // 20-35ms 的短促声音
      const bufferSize = Math.floor(this.audioContext!.sampleRate * duration);
      const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
      const data = buffer.getChannelData(0);

      // 生成短促的冲击噪音，快速衰减
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (bufferSize * 0.15)); // 快速衰减
        data[i] = (Math.random() * 2 - 1) * decay;
      }

      const source = this.audioContext!.createBufferSource();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();

      // 使用带通滤波器模拟骰子的木质/塑料声音
      filter.type = 'bandpass';
      filter.frequency.value = 2500 + Math.random() * 1500; // 2500-4000Hz
      filter.Q.value = 1.5;

      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioContext!.destination);

      gain.gain.value = volume * this.masterVolume;
      source.start();
    }, delay);
  }

  // 骰子投掷音效 - 模拟多个骰子滚动碰撞
  private playDiceThrow(): void {
    if (!this.audioContext) return;

    const volume = SOUND_VOLUMES.dice_throw;

    // 模拟骰子落下后的多次碰撞弹跳
    // 初始碰撞（落地）- 声音较大
    this.playDiceClick(0, volume * 1.0);
    this.playDiceClick(15, volume * 0.7);

    // 滚动过程中的连续小碰撞
    const rollDuration = 400; // 滚动持续400ms
    const clickCount = 12 + Math.floor(Math.random() * 6); // 12-18次碰撞

    for (let i = 0; i < clickCount; i++) {
      const t = i / clickCount;
      const delay = 50 + t * rollDuration;
      // 音量逐渐减小，模拟骰子能量损失
      const clickVolume = volume * (0.6 - t * 0.4) * (0.7 + Math.random() * 0.3);
      this.playDiceClick(delay, clickVolume);
    }

    // 最后几次弹跳（间隔越来越大，音量越来越小）
    [480, 540, 620].forEach((delay, i) => {
      this.playDiceClick(delay, volume * (0.3 - i * 0.08));
    });
  }

  // 骰子碰撞音效（单次碰撞）
  private playDiceHit(): void {
    this.playDiceClick(0, SOUND_VOLUMES.dice_hit);
  }

  // UI点击音效 - 清脆的点击声
  private playUIClick(): void {
    this.playTone(800, 0.05, 'sine', SOUND_VOLUMES.ui_click);
    setTimeout(() => this.playTone(1000, 0.03, 'sine', SOUND_VOLUMES.ui_click * 0.5), 20);
  }

  // R稀有度召唤 - 简单的成功音
  private playSummonR(): void {
    this.playChord([523, 659, 784], 0.4, SOUND_VOLUMES.summon_r); // C5, E5, G5
  }

  // SR稀有度召唤 - 更丰富的和弦
  private playSummonSR(): void {
    this.playChord([392, 494, 587, 784], 0.6, SOUND_VOLUMES.summon_sr); // G4, B4, D5, G5
    setTimeout(() => this.playTone(1047, 0.3, 'sine', 0.3), 200); // 高音点缀
  }

  // SSR稀有度召唤 - 华丽的音效
  private playSummonSSR(): void {
    // 上升琶音
    [262, 330, 392, 523, 659, 784].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.5, 'sine', 0.25), i * 60);
    });
    // 最终和弦
    setTimeout(() => {
      this.playChord([523, 659, 784, 1047], 0.8, SOUND_VOLUMES.summon_ssr);
    }, 400);
  }

  // UR稀有度召唤 - 史诗级音效
  private playSummonUR(): void {
    // 低音铺垫
    this.playTone(65, 1.5, 'sine', 0.3);
    // 上升音阶
    [131, 165, 196, 262, 330, 392, 523, 659].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.6, 'sine', 0.2), i * 80);
    });
    // 史诗和弦
    setTimeout(() => {
      this.playChord([523, 659, 784, 988, 1319], 1.2, SOUND_VOLUMES.summon_ur);
    }, 700);
    // 闪光音效
    setTimeout(() => {
      this.playTone(2093, 0.2, 'sine', 0.4);
      this.playTone(1568, 0.3, 'sine', 0.3);
    }, 900);
  }

  // 播放音效
  public async play(soundId: SoundId): Promise<void> {
    if (this.isMuted) return;
    if (!this.isInitialized) await this.init();
    if (!this.audioContext) return;

    // 确保AudioContext处于运行状态
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    switch (soundId) {
      case 'dice_throw': this.playDiceThrow(); break;
      case 'dice_hit': this.playDiceHit(); break;
      case 'ui_click': this.playUIClick(); break;
      case 'summon_r': this.playSummonR(); break;
      case 'summon_sr': this.playSummonSR(); break;
      case 'summon_ssr': this.playSummonSSR(); break;
      case 'summon_ur': this.playSummonUR(); break;
    }
  }

  // 根据稀有度播放召唤音效
  public playSummonSound(rarity: Rarity): void {
    const soundMap: Record<Rarity, SoundId> = {
      'R': 'summon_r',
      'SR': 'summon_sr',
      'SSR': 'summon_ssr',
      'UR': 'summon_ur'
    };
    this.play(soundMap[rarity]);
  }

  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    try { localStorage.setItem('audioVolume', String(this.masterVolume)); } catch {}
  }

  public getVolume(): number { return this.masterVolume; }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try { localStorage.setItem('audioMuted', String(muted)); } catch {}
  }

  public isMutedState(): boolean { return this.isMuted; }

  public loadSettings(): void {
    try {
      const volume = localStorage.getItem('audioVolume');
      if (volume !== null) this.masterVolume = parseFloat(volume);
      const muted = localStorage.getItem('audioMuted');
      if (muted !== null) this.isMuted = muted === 'true';
    } catch {}
  }

  public isReady(): boolean { return this.isInitialized; }
}

// 导出单例实例
export const audioService = AudioService.getInstance();

// 默认导出
export default audioService;
