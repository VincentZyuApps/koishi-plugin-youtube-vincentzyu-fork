import type { YoutubeVideoPayload } from './image';

// ================================
// 📄 纯文本模板：只输出视频字段，不夹带缩略图
// ================================

export function formatYoutubeVideoText(payload: YoutubeVideoPayload) {
  return [
    `【📺 标题】：\t${payload.titleText}`,
    `【👤 频道】：\t${payload.channelText}`,
    `【📅 发布】：\t${payload.publishTimeText}`,
    `【▶️ 播放】：\t${payload.viewCountText}`,
    `【📝 简介】：\t${payload.descriptionText}`,
    `【🏷️ 标签】：\t${payload.tagText}`,
  ].join('\n');
}
