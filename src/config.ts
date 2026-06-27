// ================================
// ⚙️ 插件配置入口：类型、枚举、Schema 都放这里
// ================================

import { z } from 'koishi'
import { DEFAULT_CONFIG_FONT_PATH, DEFAULT_FONT_DOWNLOAD_URL } from './utils'

// ====================
// 📦 常量定义
// ====================

/** 🌐 网络请求库类型 */
export const REQUEST_LIB = {
  CTX_HTTP: 'ctx_http',
  AXIOS: 'axios',
} as const;
export type RequestLibType = typeof REQUEST_LIB[keyof typeof REQUEST_LIB];

/** 💬 消息发送形式 */
export const MSG_FORM = {
  TEXT: 'text',
  IMAGE: 'image',
  TEXT_WITH_IMAGE: 'text-with-image',
  FORWARD: 'forward',
} as const;
export const LEGACY_MSG_FORM = {
  IMAGE_WITH_TEXT: 'image-with-text',
} as const;
export type MsgFormType = typeof MSG_FORM[keyof typeof MSG_FORM];

/** 🔒 代理协议类型 */
export const PROXY_PROTOCOL = {
  HTTP: 'http',
  HTTPS: 'https',
  SOCKS4: 'socks4',
  SOCKS5: 'socks5',
  SOCKS5H: 'socks5h',
} as const;
export type ProxyProtocolType = typeof PROXY_PROTOCOL[keyof typeof PROXY_PROTOCOL];

// ====================
// 📋 配置接口定义
// ====================

export interface Config {
  // ==================
  // 🔑 基础配置字段
  // ==================
  youtubeApiKey: string,
  enableParseUrlFromPlatformSession: boolean,
  middlewareWorkMode: 'standalone' | 'rest_client';
  restClientTargetUrl: string;

  // ==================
  // 🖥️ REST 服务配置字段
  // ==================
  enableRestfulService: boolean
  restServiceBindIp: string
  restServiceBindPort: number

  // ==================
  // 🌐 网络请求配置字段
  // ==================
  requestLib: RequestLibType;
  proxyProtocol: ProxyProtocolType;
  proxyIp: string;
  proxyPort: number;
  userAgent: string;

  // ==================
  // 📝 视频简介配置字段
  // ==================
  hideDescription: boolean,
  maxDescriptionLength: number,

  // ==================
  // 💬 消息发送配置字段
  // ==================
  msgFormArr: Array<string>,
  quoteWhenSend: boolean,

  // ==================
  // 🔤 字体工具配置字段
  // ==================
  enableCustomFont: boolean,
  autoDownloadFont: boolean,
  customFontPath: string,
  fontDownloadUrl: string,

  // ==================
  // 🛡️ 平台白名单配置字段
  // ==================
  platformWhitelistArr: {
    platformName: string,
    userIdWhilelist: Array<string>,
  }[]
  sendWhiteListHint: boolean;

  // ==================
  // 🐛 调试配置字段
  // ==================
  enableVerboseSessionOutput: boolean,
  enableVerboseConsoleOutput: boolean,
}

// ====================
// ⚙️ 配置 Schema 定义
// ====================

export const Config: z<Config> = z.intersect([
  // ==================
  // 🔧 基础配置分组
  // ==================
  z.object({
    youtubeApiKey: z.string()
      .role('secret')
      .required()
      .description("🔑 (必填) 请在此填写你的 YouTube API Key → → → → →"),
    enableParseUrlFromPlatformSession: z.boolean()
      .default(true)
      .description("🔗 是否启用从平台聊天会话中解析 URL"),
    middlewareWorkMode: z.union([
      z.const('standalone').description("🏠 独立模式"),
      z.const('rest_client').description("🔌 REST 客户端模式")
    ]).default('standalone').role('radio')
      .description("⚡ 工作模式"),
    restClientTargetUrl: z.string()
      .default("http://127.0.0.1:8020")
      .description("🎯 REST 客户端模式下，目标服务器地址（实例B的地址）")
  })
    .description("🔧 基础配置"),

  // ==================
  // 🖥️ REST 服务配置分组
  // ==================
  z.object({
    enableRestfulService: z.boolean()
      .default(false)
      .description("🖥️ 是否启用 RESTful 服务 (为外界提供图片渲染)"),
    restServiceBindIp: z.string()
      .default("0.0.0.0")
      .description("🏠 RESTful 服务绑定的 IP 地址"),
    restServiceBindPort: z.number()
      .min(1024).max(65535).step(1)
      .default(18020)
      .description("🚪 RESTful 服务绑定的端口"),
  }).description("🖥️ REST 服务配置"),

  // ==================
  // 🌐 网络请求 & 代理配置分组
  // ==================
  z.object({
    requestLib: z.union([
      z.const(REQUEST_LIB.CTX_HTTP).description("📡 使用 Koishi 提供的 ctx.http 进行网络请求"),
      z.const(REQUEST_LIB.AXIOS).description("🚀 使用 axios 库进行网络请求"),
    ])
      .role('radio')
      .default(REQUEST_LIB.AXIOS)
      .description("📦 使用的网络请求库"),
    proxyProtocol: z.union([
      z.const(PROXY_PROTOCOL.HTTP).description("🌐 HTTP 代理"),
      z.const(PROXY_PROTOCOL.HTTPS).description("🔐 HTTPS 代理"),
      z.const(PROXY_PROTOCOL.SOCKS4).description("🧦 SOCKS4 代理"),
      z.const(PROXY_PROTOCOL.SOCKS5).description("🧦 SOCKS5 代理"),
      z.const(PROXY_PROTOCOL.SOCKS5H).description("🧦✨ SOCKS5h 代理 (支持远程DNS)"),
    ])
      .role('radio')
      .default(PROXY_PROTOCOL.SOCKS5H)
      .description("🔒 代理协议"),
    proxyIp: z.string()
      .role("link")
      .default("127.0.0.1")
      .description("🏠 代理地址 (IP 或域名)"),
    proxyPort: z.number()
      .min(0).max(65535).step(1)
      .default(7891)
      .description("🚪 代理端口 [0-65535]"),
    userAgent: z.string()
      .role('textarea', { rows: [3, 5] })
      .default("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36")
      .description("🕵️ User-Agent / 用户代理")
  })
    .description("🌐 网络请求 & 代理配置"),

  // ==================
  // 📝 视频简介配置分组
  // ==================
  z.object({
    hideDescription: z.boolean()
      .description("🙈 是否隐藏视频简介").default(false),
    maxDescriptionLength: z.number()
      .default(300)
      .description("📏 视频简介最大长度 (超出部分将被截断)"),
  })
    .description("📝 视频简介配置"),

  // ==================
  // 💬 消息发送形式配置分组
  // ==================
  z.object({
    msgFormArr: z.array(
      z.union([MSG_FORM.TEXT, MSG_FORM.IMAGE, MSG_FORM.TEXT_WITH_IMAGE, MSG_FORM.FORWARD])
    )
      .default([MSG_FORM.TEXT_WITH_IMAGE, MSG_FORM.IMAGE, MSG_FORM.FORWARD])
      .role("checkbox")
      .description([
        '📤 选择解析结果的发送形式',
        '📄 纯文本：只发送标题、频道、时间、播放量、简介和标签',
        '🖼️ 图片：只发送 Puppeteer 渲染的视频预览卡片',
        '📄➕🖼️ text-with-image：发送缩略图 + 文本详情，等价于旧版 text 行为',
        '📦 合并转发：发送 OneBot 合并转发消息',
      ].join('<br/>')),
    quoteWhenSend: z.boolean()
      .default(true)
      .description("💬 发送消息时是否带有引用")
  })
    .description("💬 消息发送形式配置"),

  // ==================
  // 🔤 Puppeteer 图片字体配置分组
  // ==================
  z.object({
    enableCustomFont: z.boolean()
      .default(true)
      .description("🔤 是否启用自定义渲染字体"),
    autoDownloadFont: z.boolean()
      .default(true)
      .description("📥 字体文件不存在时是否自动下载到 Koishi 数据目录"),
    customFontPath: z.string()
      .role('textarea', { rows: [2, 5] })
      .default(DEFAULT_CONFIG_FONT_PATH)
      .description("📁 自定义字体绝对路径。默认使用 Koishi 数据目录 data/fonts 下的字体文件；留空或路径错误则回退系统字体"),
    fontDownloadUrl: z.string()
      .role('link')
      .default(DEFAULT_FONT_DOWNLOAD_URL)
      .description("🌐 自动下载字体的 URL，默认使用 LXGWWenKaiMono-Regular.ttf")
  })
    .description("🔤 Puppeteer 图片字体配置"),

  // ==================
  // 🛡️ 平台白名单配置分组
  // ==================
  z.object({
    platformWhitelistArr: z.array(
      z.object({
        platformName: z.string()
          .description('🏷️ 平台名称'),
        userIdWhilelist: z.array(
          z.string().description('👤 白名单用户 ID')
        )
          .role('table')
          .description('📋 白名单用户 ID 列表')
      })
    )
      .role('table')
      .default([
        {
          platformName: 'onebot',
          userIdWhilelist: ['1830540513']
        }
      ])
      .description('⚠️ YouTube 有些内容不适合发到国内聊天平台 (如 onebot)，所以加了这个配置项 hhh'),
    sendWhiteListHint: z.boolean()
      .default(false)
      .description('💡 是否发送白名单校验结果提示 <br/> ✅ 白名单用户，开始解析链接... <br/> ❌ 非白名单用户，已跳过解析。')
  })
    .description("🛡️ 平台白名单配置"),

  // ==================
  // 🐛 调试配置分组
  // ==================
  z.object({
    enableVerboseSessionOutput: z.boolean()
      .default(false)
      .description('💬 是否启用 Session 调试输出 (发送到聊天平台)'),
    enableVerboseConsoleOutput: z.boolean()
      .default(false)
      .description('🖥️ 是否启用 Console 调试输出 (输出到控制台日志)')
  })
    .description("🐛 调试配置")

])
