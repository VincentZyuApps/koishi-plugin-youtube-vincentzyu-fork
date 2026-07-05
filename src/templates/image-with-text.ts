import { h } from 'koishi';
import type { YoutubeVideoPayload } from './image';
import { formatYoutubeVideoText } from './text';

// ================================
// 🖼️➕📄 图文模板：缩略图在前，文本详情在后
// ================================

export function formatYoutubeVideoImageWithText(payload: YoutubeVideoPayload) {
  // 🧱 Koishi 的 h.image() 对 Buffer 更稳；ArrayBuffer 在部分适配器里可能被吞。
  const coverBuffer = Buffer.from(payload.coverThumlnail);

  return [
    h.image(coverBuffer, payload.coverMime),
    formatYoutubeVideoText(payload),
  ].join('\n');
}
