import { logger } from './logger';

function encodeUrlPath(url: string): string {
  try {
    if (!/[\u4e00-\u9fa5]/.test(url)) return url;
    const urlObj = new URL(url);
    urlObj.pathname = urlObj.pathname.split('/').map(segment =>
      /[\u4e00-\u9fa5]/.test(segment) ? encodeURIComponent(segment) : segment
    ).join('/');
    return urlObj.toString();
  } catch (error) {
    logger.debug('[Download] URL 编码失败，使用原始地址', error);
    return url;
  }
}

function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm'
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function triggerDownloadWithFile(arrayBuffer: ArrayBuffer, filename: string, mimeType: string) {
  const base64 = arrayBufferToBase64(arrayBuffer);
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
  }, 3000);
}

async function tryCanvasDownload(url: string, encodedUrl: string, filename: string): Promise<boolean> {
  const isImage = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(url) || /\/output\//i.test(url);
  if (!isImage) return false;

  try {
    return await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(false);
            return;
          }

          ctx.drawImage(img, 0, 0);
          canvas.toBlob(async (blob) => {
            if (!blob || blob.size <= 0) {
              resolve(false);
              return;
            }

            triggerDownloadWithFile(await blob.arrayBuffer(), filename, 'image/png');
            resolve(true);
          }, 'image/png');
        } catch (error) {
          logger.debug('[Download] Canvas 绘制失败', error);
          resolve(false);
        }
      };
      img.onerror = (error) => {
        logger.debug('[Download] 图片加载失败', error);
        resolve(false);
      };
      img.src = encodedUrl;
    });
  } catch (error) {
    logger.debug('[Download] Canvas 下载失败', error);
    return false;
  }
}

function tryExistingImageDownload(url: string, encodedUrl: string, filename: string): boolean {
  try {
    const existingImg = document.querySelector(`img[src="${url}"], img[src="${encodedUrl}"]`) as HTMLImageElement;
    if (!existingImg || !existingImg.complete || existingImg.naturalWidth <= 0) return false;

    const canvas = document.createElement('canvas');
    canvas.width = existingImg.naturalWidth;
    canvas.height = existingImg.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(existingImg, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    triggerDownloadWithFile(bytes.buffer, filename, 'image/png');
    return true;
  } catch (error) {
    logger.debug('[Download] 已加载图片下载失败', error);
    return false;
  }
}

export async function downloadMediaFile(url: string, filename: string): Promise<boolean> {
  logger.debug('[Download] 开始下载', url, filename);
  const encodedUrl = encodeUrlPath(url);

  try {
    const response = await fetch(encodedUrl, {
      mode: 'cors',
      credentials: 'omit'
    });
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        triggerDownloadWithFile(arrayBuffer, filename, getMimeType(filename));
        return true;
      }
    }
    logger.debug('[Download] fetch 下载未成功', response.status);
  } catch (error) {
    logger.debug('[Download] fetch 下载失败', error);
  }

  if (await tryCanvasDownload(url, encodedUrl, filename)) return true;
  if (tryExistingImageDownload(url, encodedUrl, filename)) return true;

  alert('自动下载失败，将在新窗口打开图片，请右键选择"另存为"保存图片。');
  window.open(encodedUrl, '_blank');
  return false;
}
