// index.ts
import { Context, h } from 'koishi'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import axios from 'axios'

import { renderYoutubeVideoImage } from './render';
import { startRestService } from './rest_service';
import { parseYoutubeVideo, extractYoutubeId } from './parse';

// 从 config.ts 导入配置相关内容
export {
  Config,
  REQUEST_LIB,
  MSG_FORM,
  PROXY_PROTOCOL,
  type Config as ConfigType,
  type RequestLibType,
  type ProxyProtocolType,
} from './config';
import { Config, REQUEST_LIB, MSG_FORM } from './config';

export const inject = {
  // required: ["http"],
  optional: ["http", "puppeteer"]
};

export const name = 'youtube-vincentzyu-fork'
export const PLUGIN_NAME = name;

export const reusable = true    // 声明此插件可重用

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
)

export const usage = `
<h1>Koishi 插件：youtube-vincentzyu-fork 视频信息概览</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>
<p>插件使用问题 / Bug反馈 / 插件开发交流，欢迎加入QQ群：<b>259248174</b></p>

<h2>📺 功能概述</h2>
<p>本插件会自动识别群聊中的 YouTube 视频链接，并返回视频预览信息，支持以下两种格式：</p>
<ul>
  <li>https://youtu.be/<code>{id}</code></li>
  <li>https://www.youtube.com/watch?v=<code>{id}</code></li>
</ul>

<hr>

<p>📦 插件仓库地址：</p>
<ul>
  <li><a href="https://github.com/H4M5TER/koishi-plugin-youtube">【点我跳转 -> 上游仓库】https://github.com/H4M5TER/koishi-plugin-youtube</a></li>
  <li><a href="https://github.com/VincentZyu233/koishi-plugin-youtubezyu-fork">【点我跳转 -> 本插件仓库】https://github.com/VincentZyu233/koishi-plugin-youtube-zyu-fork</a></li>
</ul>

<hr>

<h2>🔧 使用方法</h2>
<ol>
  <li>
    根据 Google 开发者文档创建一个应用并启用 YouTube Data API v3，获取你的 API Key。<br>
    <a href="https://developers.google.com/youtube/v3/getting-started" target="_blank">
      【点我跳转 -> YouTube Data API Overview | Google Developers】https://developers.google.com/youtube/v3/getting-started
    </a>
  </li>
  <br>
  <li>在 Koishi 后台插件配置中填写 API Key 并启用本插件。</li>
  <br>
  <li>保存配置后，插件将自动工作。</li>
</ol>

<hr>

<h2>💡 提示</h2>
<ul>
  <li>确保网络环境能访问 YouTube API，否则无法获取视频信息。</li>
  <li>API Key 有每日调用配额，请妥善管理。</li>
</ul>

<hr>

<h3>插件许可声明</h3>
<p>本插件为开源免费项目，基于 MIT 协议开放。欢迎修改、分发与二次开发。</p>
`

// REST 客户端函数
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
    ctx.logger.error(`REST 客户端调用失败: ${targetUrl}`, error);
    throw error;
  }
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger(`${PLUGIN_NAME}-${config.enableParseUrlFromPlatformSession ? '启用解析消息url' : '禁用解析消息url'}`);
  startRestService(ctx, config);

  ctx.middleware(async (session, next) => {
    const isYoutube = session.content.includes('youtube.com') || session.content.includes('https://youtu.be')
    if (!isYoutube) return next()

    if (!config.enableParseUrlFromPlatformSession) {
      logger.info("URL解析功能已禁用，跳过处理。");
      return next();
    }

    let isValidUser: boolean = true;
    if (config.platformWhitelistArr && config.platformWhitelistArr.length > 0) {
      const platformConfig = config.platformWhitelistArr.find(item => item.platformName === session.platform)
      if (platformConfig && platformConfig.userIdWhilelist && platformConfig.userIdWhilelist.length > 0) {
        if (!platformConfig.userIdWhilelist.includes(session.userId)) {
          isValidUser = false;
        }
      }
    }

    let hintMsgId = undefined;
    if (isValidUser) {
      if (config.sendWhiteListHint) {
        hintMsgId = await session.send(`${h.quote(session.messageId)}✅ 白名单用户，开始解析链接...`);
      }
    } else {
      if (config.sendWhiteListHint) {
        hintMsgId = await session.send(`${h.quote(session.messageId)}❌ 非白名单用户，已跳过解析。`);
      }
      return next();
    }

    try {
      if (config.middlewareWorkMode === 'rest_client') {
        // REST 客户端模式：调用远程服务
        logger.info(`REST 客户端模式：调用远程服务 ${config.restClientTargetUrl}`);

        // 如果需要文本模式，先调用 parse 获取视频信息
        if (config.msgFormArr.includes(MSG_FORM.TEXT)) {
          const parseResult = await callRestService(ctx, config, session.content, 'parse');
          
          // 将 base64 图片数据转换为 ArrayBuffer 用于显示
          const thumbnailBuffer = Buffer.from(parseResult.coverThumlnail, 'base64');
          
          let textMsgArr = [
            h.image(thumbnailBuffer, parseResult.coverMime),
            h.text(`标题：\t${parseResult.titleText}`),
            h.text(`频道：\t${parseResult.channelText}`),
            h.text(`时间：\t${parseResult.publishTimeText}`),
            h.text(`播放量：\t${parseResult.viewCountText}`),
            h.text(`简介：\t${parseResult.descriptionText}`),
            h.text(`标签：\t${parseResult.tagText}`)
          ];
          const textMsg = textMsgArr.join('\n');
          await session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${textMsg}`);
        }

        // 如果需要图片模式，调用 render-from-url
        if (config.msgFormArr.includes(MSG_FORM.IMAGE)) {
          const renderResult = await callRestService(ctx, config, session.content, 'render-from-url');
          await session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${renderResult.imageBase64}`)}`);
        }

        if (config.msgFormArr.includes(MSG_FORM.FORWARD)){
          // TODO: 实现合并转发逻辑
        }

      } else {
        // 独立模式：使用本地解析函数（原有逻辑）
        const payload = await parseYoutubeVideo(ctx, config, session.content);

        if (config.msgFormArr.includes(MSG_FORM.TEXT)) {
          let textMsgArr = [
            h.image(payload.coverThumlnail, payload.coverMime),
            h.text(`标题：\t${payload.titleText}`),
            h.text(`频道：\t${payload.channelText}`),
            h.text(`发布时间：\t${payload.publishTimeText}`),
            h.text(`播放量：\t${payload.viewCountText}`),
            h.text(`简介：\t${payload.descriptionText}`),
            h.text(`标签：\t${payload.tagText}`)
          ];
          const textMsg = textMsgArr.join('\n');
          await session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${textMsg}`);
        }

        if (config.msgFormArr.includes(MSG_FORM.IMAGE)) {
          const imageBase64 = await renderYoutubeVideoImage(ctx, payload);
          await session.send(`${config.quoteWhenSend ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${imageBase64}`)}`);
        }

        if (config.msgFormArr.includes(MSG_FORM.FORWARD)){
          // TODO: 实现合并转发逻辑
        }
      }

      hintMsgId!==undefined && await session.bot.deleteMessage(session.channelId, hintMsgId[0]);

    } catch (error) {
      const workModeText = config.middlewareWorkMode === 'rest_client' 
        ? 'REST客户端模式'
        : '独立模式';
      
      // 构建简要错误信息
      let briefErrorMsg = `⚠️ YouTube视频解析失败 (${workModeText})`;
      
      // 根据错误类型生成简要提示
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
      
      // 构建详细错误信息
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
      
      // 发送到聊天平台
      await session.send(`${h.quote(session.messageId)}${config.enableVerboseSessionOutput ? detailedErrorMsg : briefErrorMsg}`);
      
      // 输出到控制台日志
      logger.error(`YouTube视频解析失败 (${workModeText})`);
      if (config.enableVerboseConsoleOutput) {
        logger.error(`[详细错误] ${error.message}`);
        if (error.stack) {
          logger.error(`[错误堆栈] ${error.stack}`);
        }
      }
    }
  })
}
