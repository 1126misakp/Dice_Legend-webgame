import React from 'react';
import {
  Axe, Circle, Crosshair, Droplets, Feather, Flag, Flame, Gem, Hand,
  Mountain, Moon, Shield, Sparkles, Star, Sun, Sword, Swords, Target, Wand2,
  Wind, Book
} from 'lucide-react';

type CardIcon = React.ComponentType<{ size?: number; className?: string }>;

export type ProfessionStyle =
  | { bg: string; icon: CardIcon; border: string; isRainbow?: false }
  | { bg: 'rainbow'; icon: CardIcon; border: 'rainbow'; isRainbow: true };

export const rarityThemes = {
  UR: {
    border: 'border-transparent',
    shadow: 'shadow-[0_0_60px_rgba(255,255,255,0.5)]',
    stars: 5,
    textColor: 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-green-400 to-blue-400 animate-pulse'
  },
  SSR: {
    border: 'border-yellow-400',
    shadow: 'shadow-[0_0_50px_rgba(250,204,21,0.6)]',
    stars: 4,
    textColor: 'text-yellow-100'
  },
  SR: {
    border: 'border-purple-500',
    shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.6)]',
    stars: 3,
    textColor: 'text-purple-100'
  },
  R: {
    border: 'border-blue-500',
    shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
    stars: 2,
    textColor: 'text-blue-100'
  }
};

const DestinyChildIcon: React.FC<{ className?: string; size?: number }> = ({ className, size = 24 }) => (
  <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="7" cy="7" r="3" fill="currentColor" opacity="0.9" />
    <g stroke="currentColor" strokeWidth="1">
      <line x1="7" y1="2" x2="7" y2="3" />
      <line x1="7" y1="11" x2="7" y2="12" />
      <line x1="2" y1="7" x2="3" y2="7" />
      <line x1="11" y1="7" x2="12" y2="7" />
      <line x1="3.5" y1="3.5" x2="4.2" y2="4.2" />
      <line x1="9.8" y1="9.8" x2="10.5" y2="10.5" />
      <line x1="3.5" y1="10.5" x2="4.2" y2="9.8" />
      <line x1="9.8" y1="4.2" x2="10.5" y2="3.5" />
    </g>
    <path d="M19 17a4 4 0 1 1-3-6.5 3 3 0 0 0 3 6.5z" fill="currentColor" opacity="0.8" />
    <polygon points="12,8 13,11 16,11 13.5,13 14.5,16 12,14 9.5,16 10.5,13 8,11 11,11" fill="currentColor" />
  </svg>
);

export function getProfessionStyle(profession: string): ProfessionStyle {
  if (profession.includes('命运之子')) return { bg: 'rainbow', icon: DestinyChildIcon, border: 'rainbow', isRainbow: true };
  if (profession.includes('战') || profession.includes('狂') || profession.includes('冠军')) return { bg: 'bg-red-700', icon: Axe, border: 'border-red-400' };
  if (profession.includes('佣') || profession.includes('勇')) return { bg: 'bg-orange-700', icon: Sword, border: 'border-orange-400' };
  if (profession.includes('剑')) return { bg: 'bg-red-600', icon: Sword, border: 'border-red-300' };
  if (profession.includes('贼') || profession.includes('刺') || profession.includes('抹杀') || profession.includes('暗')) return { bg: 'bg-slate-700', icon: Swords, border: 'border-slate-400' };
  if (profession.includes('斗') || profession.includes('武') || profession.includes('拳') || profession.includes('决斗')) return { bg: 'bg-amber-700', icon: Hand, border: 'border-amber-400' };
  if (profession.includes('弓骑') || profession.includes('游侠')) return { bg: 'bg-emerald-800', icon: Crosshair, border: 'border-emerald-500' };
  if (profession.includes('天马') || profession.includes('独角兽')) return { bg: 'bg-sky-500', icon: Feather, border: 'border-sky-300' };
  if (profession.includes('弓') || profession.includes('射') || profession.includes('狙击')) return { bg: 'bg-emerald-600', icon: Target, border: 'border-emerald-300' };
  if (profession.includes('骑') || profession.includes('马')) return { bg: 'bg-indigo-700', icon: Flag, border: 'border-indigo-400' };
  if (profession.includes('重') || profession.includes('甲') || profession.includes('盾') || profession.includes('守') || profession.includes('铠') || profession.includes('将军')) return { bg: 'bg-blue-800', icon: Shield, border: 'border-blue-400' };
  if (profession.includes('术士') || profession.includes('巫术')) return { bg: 'bg-purple-800', icon: Book, border: 'border-purple-500' };
  if (profession.includes('召') || profession.includes('通灵')) return { bg: 'bg-fuchsia-700', icon: Circle, border: 'border-fuchsia-400' };
  if (profession.includes('牧') || profession.includes('神官') || profession.includes('修道')) return { bg: 'bg-yellow-600', icon: Gem, border: 'border-yellow-300' };
  if (profession.includes('魔导') || profession.includes('贤者')) return { bg: 'bg-violet-700', icon: Wand2, border: 'border-violet-400' };
  if (profession.includes('魔术') || profession.includes('咒术')) return { bg: 'bg-pink-700', icon: Star, border: 'border-pink-400' };
  return { bg: 'bg-slate-600', icon: Sword, border: 'border-slate-400' };
}

export function getRaceStyle(race: string): string {
  const map: Record<string, string> = {
    '人类': 'bg-blue-600 border-blue-300',
    '精灵': 'bg-green-600 border-green-300',
    '恶魔': 'bg-red-800 border-red-400',
    '神族': 'bg-amber-500 border-yellow-200',
    '龙族': 'bg-rose-700 border-rose-300',
    '亡灵': 'bg-gray-700 border-gray-400'
  };
  return map[race] || 'bg-slate-600 border-slate-300';
}

export function getAttrStyle(attribute: string): { color: string; icon: CardIcon } {
  if (attribute.includes('火')) return { color: 'bg-orange-600 border-orange-300', icon: Flame };
  if (attribute.includes('水') || attribute.includes('冰')) return { color: 'bg-cyan-600 border-cyan-300', icon: Droplets };
  if (attribute.includes('风') || attribute.includes('雷')) return { color: 'bg-teal-600 border-teal-300', icon: Wind };
  if (attribute.includes('木') || attribute.includes('地') || attribute.includes('钢')) return { color: 'bg-lime-700 border-lime-300', icon: Mountain };
  if (attribute.includes('光')) return { color: 'bg-yellow-500 border-yellow-200', icon: Sun };
  if (attribute.includes('暗')) return { color: 'bg-purple-800 border-purple-400', icon: Moon };
  return { color: 'bg-slate-500 border-slate-300', icon: Sparkles };
}

export function getProfessionStyles(profession: string): ProfessionStyle[] {
  return profession.split('/').map(item => getProfessionStyle(item.trim()));
}

export function splitCharacterName(name: string): { firstName: string; titlePart: string } {
  const [firstName, ...rest] = name.split('·');
  return { firstName, titlePart: rest.join('·') };
}
