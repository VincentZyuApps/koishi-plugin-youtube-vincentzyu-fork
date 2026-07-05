// ================================
// ⚙️ 插件配置入口：类型、枚举、Schema 都放这里
// ================================

import { z } from 'koishi'
import { DEFAULT_CONFIG_FONT_PATH, DEFAULT_FONT_DOWNLOAD_URL } from './utils/fonts'

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
  IMAGE_WITH_TEXT: 'image-with-text',
  TEXT_WITH_IMAGE: 'text-with-image',
  FORWARD: 'forward',
} as const;
export const LEGACY_MSG_FORM = {
  IMAGE_WITH_TEXT: MSG_FORM.IMAGE_WITH_TEXT,
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

  // ==================
  // 🖥️ REST 服务配置字段
  // ==================
  middlewareWorkMode: 'standalone' | 'rest_client';
  restClientTargetUrl: string;
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
  // 🎨 Puppeteer 渲染设置字段
  // ==================
  renderImageWidth: number,
  enableCustomFont: boolean,
  autoDownloadFont: boolean,
  customFontPath: string,
  fontDownloadUrl: string,

  // ==================
  // 🛡️ 平台白名单配置字段
  // ==================
  enablePlatformWhitelist: boolean,
  platformWhitelistPlatformArr: {
    platform: string,
    enabled: boolean,
  }[],
  platformWhitelistUserArr: {
    userId: string,
    enabled: boolean,
  }[],
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
      .description("🔗 是否启用从平台聊天会话中解析 URL")
  })
    .description("🔧 基础配置"),

  // ==================
  // 🖥️ REST 服务配置分组
  // ==================
  z.object({
    middlewareWorkMode: z.union([
      z.const('standalone').description("🏠 独立模式"),
      z.const('rest_client').description("🔌 REST 客户端模式")
    ]).default('standalone').role('radio')
      .description("⚡ 工作模式"),
    restClientTargetUrl: z.string()
      .default("http://127.0.0.1:50820")
      .description("🎯 REST 客户端模式下，目标服务器地址（实例B的地址）"),
    enableRestfulService: z.boolean()
      .default(false)
      .description("🖥️ 是否启用 RESTful 服务 (为外界提供图片渲染)"),
    restServiceBindIp: z.string()
      .default("0.0.0.0")
      .description("🏠 RESTful 服务绑定的 IP 地址"),
    restServiceBindPort: z.number()
      .min(1024).max(65535).step(1)
      .default(60820)
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
      z.union([MSG_FORM.TEXT, MSG_FORM.IMAGE, MSG_FORM.IMAGE_WITH_TEXT, MSG_FORM.TEXT_WITH_IMAGE, MSG_FORM.FORWARD])
    )
      .default([MSG_FORM.IMAGE_WITH_TEXT, MSG_FORM.IMAGE, MSG_FORM.FORWARD])
      .role("checkbox")
      .description([
        '📤 选择解析结果的发送形式',
        '📄 纯文本：只发送标题、频道、时间、播放量、简介和标签',
        '🖼️ 图片：只发送 Puppeteer 渲染的视频预览卡片',
        '🖼️➕📄 image-with-text：发送缩略图 + 文本详情，等价于旧版图文行为',
        '📄➕🖼️ text-with-image：发送文本详情 + 缩略图',
        '📦 合并转发：发送 OneBot 合并转发消息',
      ].join('<br/>')),
    quoteWhenSend: z.boolean()
      .default(true)
      .description("💬 发送消息时是否带有引用")
  })
    .description("💬 消息发送形式配置"),

  // ==================
  // 🎨 Puppeteer 渲染设置分组
  // ==================
  z.object({
    renderImageWidth: z.number()
      .min(320)
      .max(960)
      .step(5)
      .default(555)
      .description("🖼️ Puppeteer 预览图输出宽度(px)，影响渲染卡片和截图宽度"),
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
      .description("🌐 自动下载字体的 URL。使用默认值时优先从 Gitee 下载，失败后 fallback 到 GitHub；填写自定义 URL 时只尝试该地址")
  })
    .description("🎨 Puppeteer 渲染设置"),

  // ==================
  // 🛡️ 平台白名单配置分组
  // ==================
  z.object({
    enablePlatformWhitelist: z.boolean()
      .default(false)
      .description('🛡️ 是否启用白名单校验。关闭时所有平台、所有用户都会直接放行，不检查下面的平台表和用户表，也不会发送白名单校验结果提示。开启后，会先检查当前平台是否在「校验平台表」中启用；只有命中的平台才继续检查用户白名单。'),
    platformWhitelistPlatformArr: z.array(
      z.object({
        platform: z.string()
          .description('🏷️ 平台名称'),
        enabled: z.boolean()
          .default(true)
          .description('✅ 是否启用')
      })
    )
      .role('table')
      .default([
        {
          platform: 'onebot',
          enabled: true
        },
        {
          platform: 'kook',
          enabled: true
        },
        {
          platform: 'qq',
          enabled: false
        }
      ])
      .description('📋 需要进行白名单校验的平台列表。全局白名单开关开启后，只有当前 session.platform 命中本表中 enabled=true 的平台，才会继续检查用户白名单；未列入的平台，或 enabled=false 的平台，所有用户都会直接放行。默认对 onebot 和 kook 开启校验。'),
    platformWhitelistUserArr: z.array(
      z.object({
        userId: z.string()
          .description('👤 白名单用户 ID'),
        enabled: z.boolean()
          .default(true)
          .description('✅ 是否启用')
      })
    )
      .role('table')
      .default([
        {
          userId: '123456789',
          enabled: true
        },
        {
          userId: '1830540513',
          enabled: true
        }
      ])
      .description('👤 白名单用户 ID 列表。仅在全局白名单开关开启，且当前平台命中上方「校验平台表」时生效；只有 session.userId 命中本表中 enabled=true 的用户才会继续解析，未命中则跳过。用户 ID 不区分平台，同一个 ID 规则会作用于所有需要校验的平台。'),
    sendWhiteListHint: z.boolean()
      .default(false)
      .description('💡 是否发送白名单校验结果提示 <br/> <strong><em>✅ 白名单用户，开始解析链接...</em></strong> <br/> <strong><em>❌ 非白名单用户，已跳过解析。</em></strong><br>仅在全局白名单开关开启，且当前平台确实命中「校验平台表」时才可能发送；这个开关只控制提示消息，不影响白名单校验是否生效。')
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
