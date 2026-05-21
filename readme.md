![koishi-plugin-youtube-vincentzyu-fork](https://socialify.git.ci/VincentZyuApps/koishi-plugin-youtube-vincentzyu-fork/image?custom_description=%F0%9F%8E%AF+Koishi+%E6%8F%92%E4%BB%B6+-+%E8%87%AA%E5%8A%A8%E6%A3%80%E6%B5%8B%E8%81%8A%E5%A4%A9%E4%B8%AD%E7%9A%84+YouTube+%E9%93%BE%E6%8E%A5%EF%BC%8C%E9%80%9A%E8%BF%87+YouTube+Data+API+v3+%E8%8E%B7%E5%8F%96%E8%A7%86%E9%A2%91%E4%BF%A1%E6%81%AF+%F0%9F%93%8A%EF%BC%8C%E6%94%AF%E6%8C%81%E6%96%87%E6%9C%AC%E6%88%96+Puppeteer+%E6%B8%B2%E6%9F%93%E7%9A%84%E7%B2%BE%E7%BE%8E%E9%A2%84%E8%A7%88%E4%BF%A1%E6%81%AF%E5%9B%BE%E7%89%87+%F0%9F%96%BC%EF%B8%8F%E3%80%82%E6%94%AF%E6%8C%81%E7%8B%AC%E7%AB%8B%E6%A8%A1%E5%BC%8F%2FREST+%E5%88%86%E5%B8%83%E5%BC%8F%E9%83%A8%E7%BD%B2%E3%80%81SOCKS%2FHTTP+%E4%BB%A3%E7%90%86%E3%80%81%E5%B9%B3%E5%8F%B0%E7%99%BD%E5%90%8D%E5%8D%95%E3%80%82+&description=1&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png%3F_%3D20230331182243&name=1&owner=1&pulls=1&stargazers=1&theme=Auto)

# 🎯 koishi-plugin-youtube-vincentzyu-fork

[![npm](https://img.shields.io/npm/v/koishi-plugin-youtube-vincentzyu-fork?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-youtube-vincentzyu-fork)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-youtube-vincentzyu-fork?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-youtube-vincentzyu-fork)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-youtube-vincentzyu-fork)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-youtube-vincentzyu-fork)
[![Koishi Forum](https://img.shields.io/badge/forum.koishi.xyz_topic_11779-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white)](https://forum.koishi.xyz/t/topic/11779)

> youtube plugin for koishi, vincentzyu fork version
> forked from https://github.com/H4M5TER/koishi-plugin-youtube

## preview
![text_and_image](https://raw.githubusercontent.com/VincentZyuApps/koishi-plugin-youtube-vincentzyu-fork/master/doc/preview-images/text_and_image.png)
![only_image](https://raw.githubusercontent.com/VincentZyuApps/koishi-plugin-youtube-vincentzyu-fork/master/doc/preview-images/only_image.png)

## How to use

### google api key
* 根据Google开发者文档指引，创建一个app并且打开v3 api，记下你的apikey
  [YouTube Data API Overview  |  Google Developers](https://developers.google.com/youtube/v3/getting-started)

> 
* 将apikey填入到koishi后台插件配置中并且启用youtube插件
* 插件将会自动识别群聊里的YouTube视频链接并返回视频预览内容等等，包含以下两种：
  * https://youtu.be/{id}
  * https://www.youtube.com/watch?v={id}

### work mode
* 支持两种工作模式： `standalone` 和 `distributed`

### proxy
* 我只测了socks5 axios，其他的不知道(能不能用(

