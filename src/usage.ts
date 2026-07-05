import { readFileSync } from 'fs';
import { resolve } from 'path';

// ================================
// 📖 插件说明页：Koishi 控制台里展示的 usage HTML
// ================================

const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

const KOISHI_LOGO_BASE64 = 'data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAABU0lEQVR42p2UQSsFYRSGnxnqLuytKWKpKFkQNsS%2FsOHPWPADLCmxU5S7UzYWNrJR7lYiRF2FeWzOMKZ7mXHqNNP5vvP2nu%2B850CY2lP4X1K31ZbaDm%2BpO%2Bpyp5wfAXVEPfRvO1JHf4AVQGbUh7j4EZ4VkrNCXPVRnf3CUBN1SH2KC28VGOV3ntRhNclZHdcAKYM11QR1oVBOXctzFlNgBTC8qmXxPQEegbVeYApIgJT6tg%2F0AdMp0B%2FBpCabK2AAmAAa%2F2GRBft1oBFPkqTAba7LCiAfQC9wClwAY1HJHepuiO29Yrsf1Dn1uiDU3RTYCtTkl1Leg8k9MB4NGgReI28rV3azgyCz0og01Xl1Uz1QX8uCTELm3UbkTF1VJ9Wr0tn3iBSGdjYG0XivE3VN3VD31PM4a3cc2tIGGI0VkTO7rLxGuiy25ejmjfqsvkSXui62TxaK03td4FXTAAAAAElFTkSuQmCC';

export const usage = `
<h1>📺 Koishi 插件：youtube-vincentzyu-fork</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-youtube-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-youtube-vincentzyu-fork?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/koishi-plugin-youtube-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-youtube-vincentzyu-fork?style=flat-square&logo=npm" alt="npm downloads">
  </a>
  <br>
  <a href="https://koishi.chat/" target="_blank">
    <img src="https://img.shields.io/badge/Koishi-plugin-5546A3?style=flat-square&logo=${KOISHI_LOGO_BASE64}" alt="Koishi">
  </a>
  <a href="https://developers.google.com/youtube/v3" target="_blank">
    <img src="https://img.shields.io/badge/YouTube-Data%20API%20v3-FF0000?style=flat-square&logo=youtube&logoColor=white" alt="YouTube Data API v3">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-youtube-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-youtube-vincentzyu-fork" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://forum.koishi.xyz/t/topic/11779" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-11779-5546A3?style=for-the-badge&logo=${KOISHI_LOGO_BASE64}&logoColor=white" alt="Koishi Forum">
  </a>
  <a href="https://qm.qq.com/q/ZN7fxZ3qCq" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<hr>

<h2>✨ 功能概述</h2>
<p>自动识别聊天中的 YouTube 视频链接，通过 YouTube Data API v3 获取标题、频道、发布时间、播放量、简介、标签和封面，并按配置发送不同形式的消息。</p>

<ul>
  <li>📄 <b>纯文本</b>：只发送视频字段信息。</li>
  <li>🖼️ <b>图片</b>：使用 Puppeteer 渲染 YouTube 风格预览卡片。</li>
  <li>🖼️➕📄 <b>图文</b>：支持封面缩略图在前或文本详情在前。</li>
  <li>📦 <b>合并转发</b>：发送 OneBot 合并转发消息。</li>
  <li>🖥️ <b>REST 模式</b>：支持拆分聊天客户端和远端渲染服务。</li>
</ul>

<hr>

<h2>🔗 支持链接</h2>
<ul>
  <li><code>https://youtu.be/{video_id}</code></li>
  <li><code>https://www.youtube.com/watch?v={video_id}</code></li>
  <li><code>https://www.youtube.com/shorts/{video_id}</code></li>
  <li><code>https://www.youtube.com/embed/{video_id}</code></li>
</ul>

<hr>

<h2>🚀 快速开始</h2>
<ol>
  <li>打开 <a href="https://developers.google.com/youtube/v3/getting-started" target="_blank">YouTube Data API v3 文档【点我跳转到https://developers.google.com/youtube/v3/getting-started】</a>。</li>
  <li>在 Google Cloud 创建项目并启用 <code>YouTube Data API v3</code>。</li>
  <li>创建 API Key，并填入插件配置 <code>youtubeApiKey</code>。</li>
  <li>按网络环境配置代理(可选)，选择 <code>msgFormArr</code> 输出形式。</li>
  <li>保存配置后，在聊天中发送 YouTube 链接测试。</li>
</ol>

<hr>

<h2>⚙️ 常用配置提示</h2>
<ul>
  <li>📄 只发纯文本：选择 <code>text</code>，不需要 Puppeteer。</li>
  <li>🖼️ 只发渲染图：选择 <code>image</code>，需要启用 Puppeteer。</li>
  <li>🖼️➕📄 图在前文在后：选择 <code>image-with-text</code>。</li>
  <li>📄➕🖼️ 文在前图在后：选择 <code>text-with-image</code>。</li>
  <li>📦 合并转发：选择 <code>forward</code>，主要面向 OneBot 适配器。</li>
  <li>🖼️ Puppeteer 预览图默认宽度为 <code>555px</code>，可在渲染设置中调整。</li>
  <li>🔤 自定义字体默认使用 <code>ctx.baseDir/data/fonts/LXGWWenKaiMono-Regular.ttf</code>。</li>
  <li>📥 默认字体下载优先使用 Gitee release，失败后自动 fallback 到 GitHub release，并在下载后校验 size、md5、sha1、sha256、sha512。</li>
</ul>

<hr>

<h2>🧯 排错建议</h2>
<ul>
  <li>❌ 400：检查 API Key 是否正确。</li>
  <li>❌ 403：检查 YouTube API 权限、配额和 API Key 限制。</li>
  <li>❌ 404：视频可能不存在、被删除或不可访问。</li>
  <li>🌐 网络失败：检查代理协议、地址、端口和运行环境网络。</li>
  <li>🖼️ 图片失败：检查 Puppeteer 插件是否启用，浏览器是否能启动。</li>
</ul>

<hr>

<h2>📦 项目链接</h2>
<ul>
  <li><a href="https://github.com/H4M5TER/koishi-plugin-youtube" target="_blank">【点我跳转->】上游仓库：H4M5TER/koishi-plugin-youtube</a></li>
  <li><a href="https://github.com/VincentZyuApps/koishi-plugin-youtube-vincentzyu-fork" target="_blank">【点我跳转->】本插件 GitHub 仓库</a></li>
  <li><a href="https://gitee.com/vincent-zyu/koishi-plugin-youtube-vincentzyu-fork" target="_blank">【点我跳转->】本插件 Gitee 仓库</a></li>
</ul>
`;
