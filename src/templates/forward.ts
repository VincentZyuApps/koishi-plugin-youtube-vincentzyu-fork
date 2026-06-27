import type { YoutubeVideoPayload } from './image';

// ================================
// 📦 合并转发模板：生成 OneBot 可识别的 forward 消息 XML
// ================================

function addForwardNode(authorId: string | undefined, authorName: string, value: string) {
  // ⚠️ 这里沿用 onebot-info-image 的写法，最终由 index.ts 调用 h.unescape() 后发送。
  return `
    <message>
      <author ${authorId ? `id="${authorId}"` : ''} name="${authorName}"/>
      ${value}
    </message>`;
}

export function formatYoutubeVideoForward(payload: YoutubeVideoPayload, botSelf?: { userId?: string; username?: string; name?: string }) {
  const botId = botSelf?.userId;
  const botName = botSelf?.username || botSelf?.name || 'YouTube 视频解析';

  const messages = [
    addForwardNode(botId, botName, `📺 标题：${payload.titleText}`),
    addForwardNode(botId, botName, `👤 频道：${payload.channelText}`),
    addForwardNode(botId, botName, `📅 发布时间：${payload.publishTimeText}`),
    addForwardNode(botId, botName, `▶️ 播放量：${payload.viewCountText}`),
    addForwardNode(botId, botName, `📝 简介：${payload.descriptionText}`),
    addForwardNode(botId, botName, `🏷️ 标签：${payload.tagText}`),
  ].join('\n');

  return `<message forward>\n${messages}\n</message>`;
}
