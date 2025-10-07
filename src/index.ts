// index.ts
import { Context, h, Schema, z } from 'koishi'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import axios from 'axios'

import { renderYoutubeVideoImage } from './render';
import { startRestService } from './rest_service';
import { parseYoutubeVideo, extractYoutubeId } from './parse';

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

export const REQUEST_LIB = {
  CTX_HTTP: 'ctx_http',
  AXIOS: 'axios',
} as const;
export type RequestLibType = typeof REQUEST_LIB[keyof typeof REQUEST_LIB];

export const MSG_FORM = {
  TEXT: 'text',
  IMAGE: 'image',
  FORWARD: 'forward',
} as const;

export const PROXY_PROTOCOL = {
  HTTP: 'http',
  HTTPS: 'https',
  SOCKS4: 'socks4',
  SOCKS5: 'socks5',
  SOCKS5H: 'socks5h',
} as const;
export type ProxyProtocolType = typeof PROXY_PROTOCOL[keyof typeof PROXY_PROTOCOL];


export interface Config {
  youtubeApiKey: string,
  enableParseUrlFromPlatformSession: boolean,
  middlewareWorkMode: 'standalone' | 'rest_client';
  restClientTargetUrl: string;

  requestLib: RequestLibType;
  proxyProtocol: ProxyProtocolType;
  proxyIp: string;
  proxyPort: number;
  userAgent: string;

  hideDescription: boolean,
  maxDescriptionLength: number,

  msgFormArr: Array<string>,
  quoteWhenSend: boolean,

  platformWhitelistArr: {
    platformName: string,
    userIdWhilelist: Array<string>,
  }[]
  sendWhiteListHint: boolean;

  enableRestfulService: boolean
  restServiceBindIp: string
  restServiceBindPort: number

  enableVerboseSessionOutput: boolean,
  enableVerboseConsoleOutput: boolean,
}


export const Config: z<Config> = z.intersect([
  z.object({
    youtubeApiKey: z.string()
      .required()
      .description("(必填) 请在此填写你的Youtube API Key     → → → → →"),
    enableParseUrlFromPlatformSession: z.boolean()
      .default(true)
      .description("是否启用从平台聊天会话中解析URL"),
    middlewareWorkMode: z.union([
      z.const('standalone').description("独立模式"),
      z.const('rest_client').description("REST 客户端模式")
    ]).default('standalone').role('radio')
      .description("工作模式"),
    restClientTargetUrl: z.string()
      .default("http://127.0.0.1:8020")
      .description("REST 客户端模式下，目标服务器地址（实例B的地址）")
  })
    .description("基础配置"),

  z.object({
    requestLib: z.union([
      z.const(REQUEST_LIB.CTX_HTTP).description("使用koishi提供的ctx.http进行网络请求"),
      z.const(REQUEST_LIB.AXIOS).description("使用axios库进行网络请求"),
    ])
      .role('radio')
      .default(REQUEST_LIB.AXIOS)
      .description("使用的网络请求的库"),
    proxyProtocol: z.union([
      z.const(PROXY_PROTOCOL.HTTP).description("HTTP 代理"),
      z.const(PROXY_PROTOCOL.HTTPS).description("HTTPS 代理"),
      z.const(PROXY_PROTOCOL.SOCKS4).description("SOCKS4 代理"),
      z.const(PROXY_PROTOCOL.SOCKS5).description("SOCKS5 代理"),
      z.const(PROXY_PROTOCOL.SOCKS5H).description("SOCKS5h 代理 (支持远程DNS)"),
    ])
      .role('radio')
      .default(PROXY_PROTOCOL.SOCKS5H)
      .description("代理协议"),
    proxyIp: z.string()
      .role("link")
      .default("127.0.0.1")
      .description("代理的地址，ip或域名"),
    proxyPort: z.number()
      .min(0).max(65535).step(1)
      .default(7891)
      .description("代理的端口，[0, 65535]"),
    userAgent: z.string()
      .role('textarea', { rows: [3, 5] })
      .default("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36")
      .description("ua / 用户代理 / 使用者代理程式")
  })
    .description("网络请求代理配置"),

  z.object({
    hideDescription: z.boolean()
      .description("是否隐藏视频简介").default(false),
    maxDescriptionLength: z.number()
      .default(300)
      .description("视频简介最大长度。如果不隐藏，那么只会显示这么多字符"),
  })
    .description("视频简介配置"),

  z.object({
    msgFormArr: z.array(
      // z.union([MSG_FORM.TEXT, MSG_FORM.IMAGE, MSG_FORM.FORWARD])
      z.union([MSG_FORM.TEXT, MSG_FORM.IMAGE])
    )
      .default([MSG_FORM.TEXT])
      .role("checkbox")
      .description("消息发送形式。text=文本, image=图片, forward=合并转发(仅适用于onebot) <br/> *todo: 实现 forward*"),
    quoteWhenSend: z.boolean()
      .default(true)
      .description("发消息的时候带有引用")
  })
    .description("消息发送形式配置"),

  z.object({
    platformWhitelistArr: z.array(
      z.object({
        platformName: z.string()
          .required()
          .description('平台名称'),
        userIdWhilelist: z.array(
          z.string().required().description('白名单用户ID')
        )
          .role('table')
          .description('白名单用户ID列表')
      })
    )
      .role('table')
      .default([
        {
          platformName: 'onebot',
          userIdWhilelist: ['1830540513']
        }
      ])
      .description('ytb有些内容不适合发到国内的某些聊天平台，比如onebot，所以我加了这个配置项hhh'),
    sendWhiteListHint: z.boolean()
      .default(false)
      .description('是否发送白名单校验结果提示 <br/> 发送1:✅ 白名单用户，开始解析链接... <br/> 发送2:❌ 非白名单用户，已跳过解析。')
  })
    .description("平台白名单配置"),

  z.object({
    enableRestfulService: z.boolean()
      .default(false)
      .description("是否启用 RESTful 服务, 为外界提供图片渲染"),
    restServiceBindIp: z.string()
      .default("0.0.0.0")
      .description("RESTful 服务绑定的IP地址"),
    restServiceBindPort: z.number()
      .min(1024).max(65535).step(1)
      .default(18020)
      .description("RESTful 服务绑定的端口"),
  }).description("rest服务配置"),

  z.object({

    enableVerboseSessionOutput: z.boolean()
      .default(false)
      .description('是否启用 session 调试输出'),
    enableVerboseConsoleOutput: z.boolean()
      .default(false)
      .description('是否启用 console 调试输出')
  })
    .description("调试配置")

])

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
      const errorMsg = config.middlewareWorkMode === 'rest_client' 
        ? 'rest_client工作模式时发生错误:'
        : 'standalone工作模式时发生错误:';
      await session.send(`${h.quote(session.messageId)}${errorMsg}\n\t ${config.enableVerboseSessionOutput ? error.message : ''}`);
      logger.error(`${errorMsg}\n\t ${config.enableVerboseConsoleOutput ? error.message : ''}`);
    }
  })
}
