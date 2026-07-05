import axios from 'axios';
import { Context } from 'koishi';
import { Config, REQUEST_LIB, PROXY_PROTOCOL } from './config';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';

const apiEndpointPrefix = 'https://www.googleapis.com/youtube/v3/videos';

// ===== 🔎 URL 解析工具：从各种 YouTube 链接中提取视频 ID =====

function MediaFormat() {
  // 📌 支持 watch / shorts / embed / youtu.be 等常见格式。
  const ytRegEx = /(?:https?:\/\/)?(?:i\.|www\.|img\.)?(?:youtu\.be\/|youtube\.com\/|ytimg\.com\/)(?:shorts\/|embed\/|v\/|vi\/|vi_webp\/|watch\?v=|watch\?.+&v=)([\w-]{11})/

  function getIDfromRegEx(src, regEx) {
    const [, id] = src.match(regEx) ?? []
    return id
  }

  return {
    // 🎯 只返回 11 位 YouTube 视频 ID。
    getYoutubeID: function (src) {
      return getIDfromRegEx(src, ytRegEx)
    },
    // 🔗 根据 ID 还原成标准 watch 链接。
    getYoutubeUrl: function (ID) {
      return 'https://www.youtube.com/watch?v=' + ID
    }
  }
}

// ===== 🧼 URL 清洗工具：处理平台转义后的链接 =====

// 🧩 简易 HTML 实体解码，主要处理 &amp; 等常见场景。
function decodeHtmlEntities(input: string): string {
  if (!input) return input
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

// 🧹 规范化原始输入，解决平台转义后的 URL 问题。
function normalizeInputUrl(raw: string): string {
  if (!raw) return raw
  let s = raw.trim()
  // 某些平台会把 & 转义为 &amp;，导致正则无法匹配 watch?xxx&v= 场景
  s = decodeHtmlEntities(s)
  // 去掉可能的尖括号包裹
  s = s.replace(/[<>]/g, '')
  return s
}

// ===== 🎬 YouTube 数据获取：ID、API 数据、缩略图 =====

// 🆔 从 URL 中提取 YouTube 视频 ID。
export function extractYoutubeId(url: string): string | null {
  const src = normalizeInputUrl(url)
  let id
  if (src.includes('https://youtu.be')) {
    const match = src.match(/youtu\.be\/([\w-]{11})/)
    id = match ? match[1] : null
  } else {
    id = MediaFormat().getYoutubeID(src)
  }
  return id
}

// 📡 从 YouTube Data API v3 获取视频数据。
export async function fetchVideoDataFromAPI(ctx: Context, config: Config, id: string) {
  const url = `${apiEndpointPrefix}?id=${id}&key=${config.youtubeApiKey}&part=snippet,contentDetails,statistics,status`;

  const headers = { 'User-Agent': config.userAgent };
  let proxyAgent;

  if (config.requestLib === REQUEST_LIB.AXIOS) {
    const proxyUrl = `${config.proxyIp}:${config.proxyPort}`;
    switch (config.proxyProtocol) {
      case PROXY_PROTOCOL.HTTP:
      case PROXY_PROTOCOL.HTTPS:
        proxyAgent = new HttpsProxyAgent(`${config.proxyProtocol}://${proxyUrl}`);
        break;
      case PROXY_PROTOCOL.SOCKS4:
      case PROXY_PROTOCOL.SOCKS5:
      case PROXY_PROTOCOL.SOCKS5H:
        proxyAgent = new SocksProxyAgent(`${config.proxyProtocol}://${proxyUrl}`);
        break;
    }
  }

  try {
    if (config.requestLib === REQUEST_LIB.CTX_HTTP) {
      if (!ctx.http) {
        throw new Error('Koishi http service is not available.');
      }
      return await ctx.http.get(url);
    } else if (config.requestLib === REQUEST_LIB.AXIOS) {
      const response = await axios.get(url, { headers, httpsAgent: proxyAgent });
      return response.data;
    }
  } catch (error) {
    const logger = ctx.logger;
    logger.error(`❌ Failed to fetch data from YouTube API for id: ${id}`);
    
    if (config.enableVerboseConsoleOutput) {
      logger.error(`🧪 [详细调试] YouTube API 请求失败:`);
      logger.error(`🔗   - 请求URL: ${url.replace(config.youtubeApiKey, 'API_KEY_HIDDEN')}`);
      logger.error(`🧦   - 代理配置: ${config.proxyProtocol}://${config.proxyIp}:${config.proxyPort}`);
      logger.error(`📡   - 请求库: ${config.requestLib}`);
      
      if (axios.isAxiosError(error)) {
        logger.error(`🌐   - HTTP状态码: ${error.response?.status}`);
        logger.error(`🌐   - HTTP状态文本: ${error.response?.statusText}`);
        logger.error(`📦   - 响应数据: ${JSON.stringify(error.response?.data)}`);
        logger.error(`❌   - 错误消息: ${error.message}`);
        if (error.code) {
          logger.error(`🏷️   - 错误代码: ${error.code}`);
        }
      } else if (error instanceof Error) {
        logger.error(`🏷️   - 错误类型: ${error.name}`);
        logger.error(`❌   - 错误消息: ${error.message}`);
        logger.error(`📚   - 错误堆栈: ${error.stack}`);
      }
    }
    
    // 📦 包装错误，携带更多上下文信息，方便上层生成更清楚的错误提示。
    const wrappedError = new Error(error.message) as any;
    wrappedError.originalError = error;
    wrappedError.videoId = id;
    wrappedError.statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
    wrappedError.apiResponse = axios.isAxiosError(error) ? error.response?.data : undefined;
    throw wrappedError;
  }
}

// 🖼️ 下载缩略图，后续会作为文本消息图片和 Puppeteer 渲染素材。
export async function downloadThumbnail(ctx: Context, config: Config, thumbnailUrl: string): Promise<ArrayBuffer> {
  const headers = { 'User-Agent': config.userAgent };
  let proxyAgent;

  if (config.requestLib === REQUEST_LIB.AXIOS) {
    const proxyUrl = `${config.proxyIp}:${config.proxyPort}`;
    switch (config.proxyProtocol) {
      case PROXY_PROTOCOL.HTTP:
      case PROXY_PROTOCOL.HTTPS:
        proxyAgent = new HttpsProxyAgent(`${config.proxyProtocol}://${proxyUrl}`);
        break;
      case PROXY_PROTOCOL.SOCKS4:
      case PROXY_PROTOCOL.SOCKS5:
      case PROXY_PROTOCOL.SOCKS5H:
        proxyAgent = new SocksProxyAgent(`${config.proxyProtocol}://${proxyUrl}`);
        break;
    }
  }

  try {
    if (config.requestLib === REQUEST_LIB.CTX_HTTP) {
      return await ctx.http.get<ArrayBuffer>(thumbnailUrl, {
        responseType: 'arraybuffer',
      });
    } else if (config.requestLib === REQUEST_LIB.AXIOS) {
      const response = await axios.get(thumbnailUrl, {
        responseType: 'arraybuffer',
        httpsAgent: proxyAgent,
        headers
      });
      return response.data;
    }
  } catch (error) {
    ctx.logger.error(`❌ Failed to download thumbnail from: ${thumbnailUrl}`);
    throw error;
  }
}

// ===== 📦 Payload 组装：把 API 结果整理成渲染层需要的数据 =====

// 🧱 解析 YouTube 视频信息并返回统一 payload。
export async function parseYoutubeVideo(ctx: Context, config: Config, url: string) {
  const id = extractYoutubeId(url);
  if (!id) {
    throw new Error('Invalid YouTube URL or unable to extract video ID');
  }

  const result = await fetchVideoDataFromAPI(ctx, config, id);
  if (!result || !result.items || result.items.length === 0) {
    throw new Error(`Could not fetch video data for id: ${id}`);
  }

  const snippet = result.items[0].snippet;
  const statistics = result.items[0].statistics;
  const {
    title,
    description,
    channelTitle,
    thumbnails,
    publishedAt,
    tags,
  } = snippet;

  // 👀 获取播放量；部分视频可能没有 statistics.viewCount，此时显示为“未知”。
  const viewCount = statistics?.viewCount ? parseInt(statistics.viewCount).toLocaleString() : '未知';

  const thumbnailUrl = thumbnails.maxres ? thumbnails.maxres.url : thumbnails.high.url;
  const mime = 'image/' + thumbnailUrl.slice(thumbnailUrl.lastIndexOf('.') + 1);
  const thumbnail = await downloadThumbnail(ctx, config, thumbnailUrl);

  let tagString = '🏷️ --- [NO TAGS] ---';
  if (tags) {
    tagString = tags.length > 1 ? tags.join(', ') : tags[0];
  }

  let descriptionText = description;
  if (config.hideDescription) {
    descriptionText = '📝 --- [DESCRIPTION HAS BEEN HIDDEN.] ---';
  } else if (description && description.length > config.maxDescriptionLength) {
    descriptionText = description.slice(0, config.maxDescriptionLength);
    descriptionText += `...(${description.length - config.maxDescriptionLength}CHARACTERS HAS BEEN OMITEED.)`;
  }

  return {
    coverThumlnail: thumbnail,
    coverMime: mime,
    titleText: title,
    channelText: channelTitle,
    publishTimeText: publishedAt,
    descriptionText: descriptionText,
    tagText: tagString,
    viewCountText: viewCount
  };
}
