import React, { useEffect, useState } from 'react';
import { CharacterInfo } from '../types';
import { playAudioData } from '../services/voiceService';
import { ApiCapabilities, ApiKeys } from '../utils/apiKeyStore';
import { logger } from '../utils/logger';
import { downloadMediaFile } from '../utils/mediaDownload';
import { useLiveGeneration } from '../hooks/useLiveGeneration';
import CharacterCardBottomSection from './character-card/CharacterCardBottomSection';
import {
  CharacterCardStyleSheet,
  InnerRarityEffects,
  OuterRarityParticles,
  UrBorderEffect
} from './character-card/CharacterCardEffects';
import CharacterCardMedia from './character-card/CharacterCardMedia';
import CharacterCardTopSection from './character-card/CharacterCardTopSection';
import FullArtToolbar from './character-card/FullArtToolbar';
import LiveConfirmModal from './character-card/LiveConfirmModal';
import { rarityThemes } from './character-card/cardStyles';

interface Props {
  info: CharacterInfo;
  onClose: () => void;
  apiKeys: ApiKeys;
  capabilities: ApiCapabilities;
}

const CharacterCard: React.FC<Props> = ({ info, onClose, apiKeys, capabilities }) => {
  const [showFullArt, setShowFullArt] = useState(false);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [hasPlayedEntrance, setHasPlayedEntrance] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    videoUrl,
    isLiveActive,
    isLiveGenerating,
    showLiveConfirm,
    queuePosition,
    pendingQueueCount,
    setShowLiveConfirm,
    generateLiveVideo,
    handleLiveClick
  } = useLiveGeneration({ info, apiKeys, capabilities });

  const isUR = info.rarity === 'UR';
  const isSSR = info.rarity === 'SSR';
  const isSR = info.rarity === 'SR';
  const isR = info.rarity === 'R';
  const theme = rarityThemes[info.rarity as keyof typeof rarityThemes] || rarityThemes.R;

  useEffect(() => {
    if (hasPlayedEntrance) return;

    const entranceVoice = info.voices?.voices?.find(voice => voice.skillType === 'entrance');
    if (!entranceVoice) return;

    logger.debug('[Voice] 播放出场语音', entranceVoice.line);
    setHasPlayedEntrance(true);

    const timer = window.setTimeout(async () => {
      try {
        await playAudioData(entranceVoice.audioDataHex);
      } catch (error) {
        logger.error('[Voice] 出场语音播放失败', error);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [info.voices, hasPlayedEntrance]);

  const downloadAll = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!info.imageUrl || isDownloading) return;

    setIsDownloading(true);
    const safeName = info.name.replace(/\s+/g, '_').replace(/·/g, '_');
    logger.debug('[Download] 开始下载角色媒体', safeName);

    try {
      await downloadMediaFile(info.imageUrl, `${safeName}.png`);
      if (videoUrl) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await downloadMediaFile(videoUrl, `${safeName}_live.mp4`);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMouseDown = () => {
    if (showFullArt && videoUrl) setIsLongPressing(true);
  };

  const handleMouseUp = () => setIsLongPressing(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07101f] bg-[url('/ui/academy-hall.png')] bg-cover bg-center px-2 py-3 sm:p-4 animate-fade-in select-none overflow-y-auto"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/72 backdrop-blur-sm pointer-events-none" />
      <CharacterCardStyleSheet />

      {showLiveConfirm && (
        <LiveConfirmModal
          pendingQueueCount={pendingQueueCount}
          onCancel={() => setShowLiveConfirm(false)}
          onConfirm={generateLiveVideo}
        />
      )}

      <div
        className={`relative aspect-[2/3] flex flex-col group transition-all duration-300 ${showFullArt ? 'scale-[1.02]' : ''}`}
        style={{ width: 'min(calc(100vw - 1rem), 420px, calc((100dvh - 1rem) * 0.6667))' }}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        {showFullArt && (
          <FullArtToolbar
            isDownloading={isDownloading}
            onDownload={downloadAll}
            onCloseFullArt={() => setShowFullArt(false)}
          />
        )}

        <OuterRarityParticles rarity={info.rarity} isSSR={isSSR} isUR={isUR} showFullArt={showFullArt} />

        <div className={`relative w-full h-full rounded-[1.1rem] overflow-hidden border-[3px] ${showFullArt ? 'border-transparent shadow-none' : `${theme.border} ${theme.shadow} bg-[#0b1630]`} flex flex-col transition-all duration-300 shadow-[0_24px_80px_rgba(0,0,0,0.58)]`}>
          {!showFullArt && (
            <>
              <div className="absolute inset-0 z-[1] pointer-events-none bg-[url('/ui/parchment-panel.png')] bg-cover bg-center opacity-18 mix-blend-screen" />
              <div className="absolute -right-24 -top-24 z-[2] w-72 h-72 bg-[url('/ui/astrolabe-crest.png')] bg-contain bg-center bg-no-repeat opacity-24 mix-blend-screen pointer-events-none" />
              <div className="absolute inset-[8px] z-[3] pointer-events-none rounded-xl border border-amber-200/22" />
            </>
          )}

          <UrBorderEffect showFullArt={showFullArt} isUR={isUR} />

          <CharacterCardMedia
            info={info}
            videoUrl={videoUrl}
            showFullArt={showFullArt}
            isLiveActive={isLiveActive}
            isLongPressing={isLongPressing}
            hasRarityBreathing={isSR || isSSR || isUR}
          />

          {!showFullArt && (
            <CharacterCardTopSection
              info={info}
              theme={theme}
              capabilities={capabilities}
              videoUrl={videoUrl}
              isLiveActive={isLiveActive}
              isLiveGenerating={isLiveGenerating}
              queuePosition={queuePosition}
              isR={isR}
              onShowFullArt={() => setShowFullArt(true)}
              onLiveClick={handleLiveClick}
            />
          )}

          {!showFullArt && (
            <CharacterCardBottomSection
              info={info}
              capabilities={capabilities}
              isUR={isUR}
              isSSR={isSSR}
              isSR={isSR}
            />
          )}

          <InnerRarityEffects showFullArt={showFullArt} isSSR={isSSR} isUR={isUR} />
        </div>
      </div>
    </div>
  );
};

export default CharacterCard;
