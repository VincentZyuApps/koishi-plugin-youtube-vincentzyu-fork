import { h } from 'koishi';
import type { YoutubeVideoPayload } from './image';
import { formatYoutubeVideoText } from './text';

// ================================
// 📄➕🖼️ 图文模板：保持旧版“缩略图 + 文本详情”的发送效果
// ================================

export function formatYoutubeVideoTextWithImage(payload: YoutubeVideoPayload) {
  // 🧱 Koishi 的 h.image() 对 Buffer 更稳；ArrayBuffer 在部分适配器里可能被吞。
  const coverBuffer = Buffer.from(payload.coverThumlnail);

  return [
    h.image(coverBuffer, payload.coverMime),
    formatYoutubeVideoText(payload),
  ].join('\n');
}
