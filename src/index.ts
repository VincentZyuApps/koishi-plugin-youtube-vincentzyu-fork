// ===== 🚪 插件入口：注册中间件、REST 服务和主流程编排 =====

import { Context, h } from 'koishi'
import axios from 'axios'

import { startRestService } from './rest';
import { parseYoutubeVideo, extractYoutubeId } from './parse';
import { ensureCustomFont } from './utils/fonts';
import { renderYoutubeVideoImage, type YoutubeVideoPayload } from './templates/image';
import { formatYoutubeVideoText } from './templates/text';
import { formatYoutubeVideoImageWithText } from './templates/image-with-text';
import { formatYoutubeVideoTextWithImage } from './templates/text-with-image';
import { formatYoutubeVideoForward } from './templates/forward';
import { usage } from './usage';

// ===== ⚙️ 配置导出：让 Koishi 控制台能读取 Schema 和类型 =====

export {
  Config,
  LEGACY_MSG_FORM,
  REQUEST_LIB,
  MSG_FORM,
  PROXY_PROTOCOL,
  type Config as ConfigType,
  type RequestLibType,
  type MsgFormType,
  type ProxyProtocolType,
} from './config';
import { Config, REQUEST_LIB, MSG_FORM } from './config';

export const inject = {
  // 🧩 http / puppeteer 都是可选服务：文本模式可不用 Puppeteer，axios 模式可不用 ctx.http。
  optional: ["http", "puppeteer"]
};

export const name = 'youtube-vincentzyu-fork'
export const PLUGIN_NAME = name;

export const reusable = true    // ♻️ 声明此插件可重用，允许同一插件多实例配置。
export { usage };

// ===== 🔌 REST 客户端：当前实例调用远端 YouTube 渲染服务 =====

async function callRestService(ctx: Context, config: Config, url: string, endpoint: string) {
  const targetUrl = `${config.restClientTargetUrl}/${endpoint}`;
  const payload = { url };

  try {
    if (config.requestLib === REQUEST_LIB.CTX_HTTP && ctx.http) {
      return await ctx.http.post(targetUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      const response = await axios.post(targetUrl, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data;
    }
  } catch (error) {
    ctx.logger.error(`❌ REST 客户端调用失败: ${targetUrl}`, error);
    throw error;
  }
}

// ===== 🔁 REST 数据转换：把远端 parse 的 base64 缩略图还原成统一 payload =====

function normalizeRestPayload(parseResult: YoutubeVideoPayload & { coverThumlnail: string }): YoutubeVideoPayload {
  const thumbnailBuffer = Buffer.from(parseResult.coverThumlnail, 'base64');
  return {
    ...parseResult,
    coverThumlnail: thumbnailBuffer.buffer.slice(thumbnailBuffer.byteOffset, thumbnailBuffer.byteOffset + thumbnailBuffer.byteLength),
  };
}

// ===== 🧹 消息形式标准化：兼容数组、单值和异常配置 =====

function normalizeMsgForms(config: Config) {
  const rawMsgForms = Array.isArray(config.msgFormArr)
    ? config.msgFormArr
    : [config.msgFormArr].filter(Boolean);

  return rawMsgForms.map((form) => {
    const normalized = String(form).trim();
    return normalized;
  });
}

// ===== 🔎 消息形式检测日志：明确每个模式为什么发送或跳过 =====

function shouldSendMode(
  logger: ReturnType<Context['logger']>,
  msgForms: string[],
  mode: string,
  payloadReady = true,
) {
  const selected = msgForms.includes(mode);
  if (!selected) {
    logger.info(`⏭️ 跳过 YouTube 解析结果发送模式: ${mode}，原因: msgFormArr 未选择该模式`);
    return false;
  }

  if (!payloadReady) {
    logger.warn(`⚠️ 跳过 YouTube 解析结果发送模式: ${mode}，原因: payload 尚未准备好`);
    return false;
  }

  logger.info(`🎯 命中 YouTube 解析结果发送模式: ${mode}`);
  return true;
}

// ===== 📤 消息发送保护：单个模式失败时不影响其他模式继续发送 =====

async function sendWithModeGuard(
  logger: ReturnType<Context['logger']>,
  mode: string,
  send: () => Promise<unknown>,
) {
  try {
    logger.info(`📤 开始发送 YouTube 解析结果: ${mode}`);
    await send();
    logger.info(`✅ 发送 YouTube 解析结果完成: ${mode}`);
  } catch (error) {
    logger.error(`❌ 发送 YouTube 解析结果失败: ${mode}`, error);
  }
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger(`${PLUGIN_NAME}-${config.enableParseUrlFromPlatformSession ? '启用解析消息url' : '禁用解析消息url'}`);

  // 🔤 启动时先预检查字体；真正渲染时还会再次检查，避免字体被手动删除。
  ensureCustomFont(ctx, config).catch((error) => {
    ctx.logger.warn(`⚠️ [${PLUGIN_NAME}] 渲染字体预检查失败: ${error?.message || error}`);
  });

  // 🖥️ REST 服务依赖 Puppeteer，必须放进 ctx.inject()，这样服务热重载时能自动回收。
  ctx.inject(['puppeteer'], (ctx) => {
    startRestService(ctx, config);
  });

  // 👂 主中间件：监听聊天消息里的 YouTube 链接。
  ctx.middleware(async (session, next) => {
    const isYoutube = session.content.includes('youtube.com') || session.content.includes('https://youtu.be')
    if (!isYoutube) return next()

    if (!config.enableParseUrlFromPlatformSession) {
      logger.info("⏸️ URL解析功能已禁用，跳过处理。");
      return next();
    }

    const shouldCheckWhitelist = Boolean(config.enablePlatformWhitelist && config.platformWhitelistPlatformArr?.some(item =>
      item.enabled && item.platform === session.platform
    ));
    const isValidUser = !shouldCheckWhitelist || Boolean(config.platformWhitelistUserArr?.some(item =>
      item.enabled && item.userId === session.userId
    ));

    let hintMsgId = undefined;
    if (isValidUser) {
      if (shouldCheckWhitelist && config.sendWhiteListHint) {
        hintMsgId = await session.send(`${h.quote(session.messageId)}✅ 白名单用户，开始解析链接...`);
      }
    } else {
      if (shouldCheckWhitelist && config.sendWhiteListHint) {
        hintMsgId = await session.send(`${h.quote(session.messageId)}❌ 非白名单用户，已跳过解析。`);
      }
      return next();
    }

    try {
      const msgForms = normalizeMsgForms(config);
      logger.info(`🧾 msgFormArr 原始值 = ${JSON.stringify(config.msgFormArr)}`);
      logger.info(`🧹 msgFormArr 标准化后 = ${JSON.stringify(msgForms)}`);
      logger.info(`⚙️ 当前工作模式 middlewareWorkMode = ${config.middlewareWorkMode}`);
      logger.info(`💬 当前发送引用 quoteWhenSend = ${config.quoteWhenSend}`);

      if (config.middlewareWorkMode === 'rest_client') {
        // REST 客户端模式：调用远程服务
        logger.info(`🔌 REST 客户端模式：调用远程服务 ${config.restClientTargetUrl}`);

        let payload: YoutubeVideoPayload | undefined;
        const needParsedPayload = msgForms.some((form) =>
          form === MSG_FORM.TEXT
          || form === MSG_FORM.IMAGE_WITH_TEXT
          || form === MSG_FORM.TEXT_WITH_IMAGE
          || form === MSG_FORM.FORWARD
        );
        logger.info(`🔎 REST 客户端模式是否需要先调用 /parse: ${needParsedPayload}`);

        if (needParsedPayload) {
          logger.info('📡 REST 客户端模式开始调用 /parse 获取文本/图文/合并转发 payload');
          const parseResult = await callRestService(ctx, config, session.content, 'parse');
          payload = normalizeRestPayload(parseResult);
          logger.info(`✅ REST 客户端模式 /parse 完成，payload 标题 = ${payload.titleText}`);
        }

        // 📄 纯文本模式：只发送文字字段，不发送缩略图。
        if (shouldSendMode(logger, msgForms, MSG_FORM.TEXT, !!payload)) {
          await sendWithModeGuard(logger, MSG_FORM.TEXT, () =>
            session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${formatYoutubeVideoText(payload)}`)
          );
        }

        // 🖼️➕📄 图文模式：缩略图在前，文本详情在后。
        if (shouldSendMode(logger, msgForms, MSG_FORM.IMAGE_WITH_TEXT, !!payload)) {
          await sendWithModeGuard(logger, MSG_FORM.IMAGE_WITH_TEXT, () =>
            session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${formatYoutubeVideoImageWithText(payload)}`)
          );
        }

        // 📄➕🖼️ 图文模式：文本详情在前，缩略图在后。
        if (shouldSendMode(logger, msgForms, MSG_FORM.TEXT_WITH_IMAGE, !!payload)) {
          await sendWithModeGuard(logger, MSG_FORM.TEXT_WITH_IMAGE, () =>
            session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${formatYoutubeVideoTextWithImage(payload)}`)
          );
        }

        // 🖼️ 图片模式：让远端直接 parse + render，当前实例只负责发送图片。
        if (shouldSendMode(logger, msgForms, MSG_FORM.IMAGE)) {
          await sendWithModeGuard(logger, MSG_FORM.IMAGE, async () => {
            logger.info('🖼️ REST 客户端模式开始调用 /render-from-url 获取图片');
            const renderResult = await callRestService(ctx, config, session.content, 'render-from-url');
            logger.info(`✅ REST 客户端模式 /render-from-url 完成，imageBase64 长度 = ${String(renderResult.imageBase64 || '').length}`);
            await session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${renderResult.imageBase64}`)}`);
          });
        }

        // 📦 合并转发模式：目前主要面向 OneBot，其他平台是否支持取决于适配器。
        if (shouldSendMode(logger, msgForms, MSG_FORM.FORWARD, !!payload)){
          await sendWithModeGuard(logger, MSG_FORM.FORWARD, () => {
            const forwardMessage = formatYoutubeVideoForward(payload, session.bot);
            logger.info(`📦 合并转发消息 XML 长度 = ${forwardMessage.length}`);
            return session.send(h.unescape(forwardMessage));
          });
        }

      } else {
        // 🏠 独立模式：当前实例自己请求 YouTube API、下载缩略图、渲染图片。
        logger.info('🏠 独立模式开始解析 YouTube 视频 payload');
        const payload = await parseYoutubeVideo(ctx, config, session.content);
        logger.info(`✅ 独立模式解析完成，payload 标题 = ${payload.titleText}`);
        logger.info(`🖼️ 独立模式 payload 封面 MIME = ${payload.coverMime}`);
        logger.info(`📏 独立模式 payload 封面字节数 = ${Buffer.from(payload.coverThumlnail).length}`);

        if (shouldSendMode(logger, msgForms, MSG_FORM.TEXT)) {
          await sendWithModeGuard(logger, MSG_FORM.TEXT, () =>
            session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${formatYoutubeVideoText(payload)}`)
          );
        }

        if (shouldSendMode(logger, msgForms, MSG_FORM.IMAGE_WITH_TEXT)) {
          await sendWithModeGuard(logger, MSG_FORM.IMAGE_WITH_TEXT, () =>
            session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${formatYoutubeVideoImageWithText(payload)}`)
          );
        }

        if (shouldSendMode(logger, msgForms, MSG_FORM.TEXT_WITH_IMAGE)) {
          await sendWithModeGuard(logger, MSG_FORM.TEXT_WITH_IMAGE, () =>
            session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${formatYoutubeVideoTextWithImage(payload)}`)
          );
        }

        if (shouldSendMode(logger, msgForms, MSG_FORM.IMAGE)) {
          await sendWithModeGuard(logger, MSG_FORM.IMAGE, async () => {
            const imageBase64 = await renderYoutubeVideoImage(ctx, payload, config);
            logger.info(`✅ 独立模式图片渲染完成，imageBase64 长度 = ${String(imageBase64 || '').length}`);
            await session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${imageBase64}`)}`);
          });
        }

        if (shouldSendMode(logger, msgForms, MSG_FORM.FORWARD)){
          await sendWithModeGuard(logger, MSG_FORM.FORWARD, () => {
            const forwardMessage = formatYoutubeVideoForward(payload, session.bot);
            logger.info(`📦 合并转发消息 XML 长度 = ${forwardMessage.length}`);
            return session.send(h.unescape(forwardMessage));
          });
        }
      }

      hintMsgId!==undefined && await session.bot.deleteMessage(session.channelId, hintMsgId[0]);

    } catch (error) {
      const workModeText = config.middlewareWorkMode === 'rest_client' 
        ? 'REST客户端模式'
        : '独立模式';
      
      // 🧯 构建简要错误信息，默认只发用户能看懂的部分。
      let briefErrorMsg = `⚠️ YouTube视频解析失败 (${workModeText})`;
      
      // 🧭 根据错误类型生成更明确的提示，方便快速定位 API / 网络 / 视频状态问题。
      if (error.statusCode === 400) {
        briefErrorMsg += '\n❌ API请求参数错误 (400)，请检查API Key是否有效';
      } else if (error.statusCode === 403) {
        briefErrorMsg += '\n❌ API访问被拒绝 (403)，可能是配额用尽或API Key权限不足';
      } else if (error.statusCode === 404) {
        briefErrorMsg += '\n❌ 视频不存在或已被删除 (404)';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        briefErrorMsg += '\n❌ 网络连接失败，请检查代理配置';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
        briefErrorMsg += '\n❌ 请求超时，请检查网络或代理';
      } else {
        briefErrorMsg += `\n❌ ${error.message || '未知错误'}`;
      }
      
      // 🔎 构建详细错误信息；只有开启 verboseSession 才发到聊天里。
      let detailedErrorMsg = briefErrorMsg;
      if (config.enableVerboseSessionOutput) {
        detailedErrorMsg += '\n\n📋 详细调试信息:';
        detailedErrorMsg += `\n  - 错误消息: ${error.message}`;
        if (error.videoId) {
          detailedErrorMsg += `\n  - 视频ID: ${error.videoId}`;
        }
        if (error.statusCode) {
          detailedErrorMsg += `\n  - HTTP状态码: ${error.statusCode}`;
        }
        if (error.apiResponse) {
          const apiError = error.apiResponse?.error;
          if (apiError) {
            detailedErrorMsg += `\n  - API错误码: ${apiError.code}`;
            detailedErrorMsg += `\n  - API错误信息: ${apiError.message}`;
            if (apiError.errors && apiError.errors.length > 0) {
              detailedErrorMsg += `\n  - API错误原因: ${apiError.errors[0].reason}`;
            }
          }
        }
        if (error.code) {
          detailedErrorMsg += `\n  - 错误代码: ${error.code}`;
        }
      }
      
      // 📤 发送到聊天平台。
      await session.send(`${h.quote(session.messageId)}${config.enableVerboseSessionOutput ? detailedErrorMsg : briefErrorMsg}`);
      
      // 🖥️ 输出到控制台日志；详细堆栈只在 verboseConsole 下输出。
      logger.error(`❌ YouTube视频解析失败 (${workModeText})`);
      if (config.enableVerboseConsoleOutput) {
        logger.error(`🧪 [详细错误] ${error.message}`);
        if (error.stack) {
          logger.error(`📚 [错误堆栈] ${error.stack}`);
        }
      }
    }
  })
}
