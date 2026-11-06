# 一愿柳 · One Wish Willow

盒子里只有一根柳枝。写下愿望，按住折断，看看接下来会发生什么。

一个以旧店、柳盒与许愿为主题的中文互动故事网站。使用 React、TypeScript、Vite 和 Three.js，保留原始盒子、柳枝与音频素材。

## 体验

- 打开柳盒：盒盖翻开并退场，柳枝从盒中升起。
- 写下愿望：至少四个字，最多 160 字；也可以选一个示例。
- 折下柳枝：按住约两秒，支持鼠标、触屏及空格 / Enter。松手取消。
- 查看结局：故事按愿望关键词从本地预设文本中选择，不调用 AI 服务。
- 树洞：当前浏览器保存最近 12 条记录，可重新打开查看。

支持手机布局、静音与系统减少动态效果设置。网站为虚构互动体验。

## 本地开发

使用 Node.js 22 或更高版本。

```sh
npm ci
npm run dev
```

浏览器打开终端中 Vite 提示的地址，默认端口为 3000。

## 构建

```sh
npm run build
npm run preview
```

构建产物位于 `dist/`，可部署到静态网站托管服务。资源路径采用相对路径，支持子目录部署。公开 GitHub 仓库本身不会自动发布网站。

## 验证

首次运行浏览器检查时安装 Chromium：

```sh
npx playwright install chromium
npm run verify
```

检查脚本使用本地 7100 端口，覆盖桌面与手机流程、长按取消、触屏折枝、键盘操作、减少动态效果、历史记录与重新体验。截图和报告写入 `artifacts/`，不提交到 Git。

## 主要文件

| 文件 | 内容 |
| --- | --- |
| `src/App.tsx` | 流程、文案、许愿输入与历史记录 |
| `src/components/WillowScene.tsx` | 3D 旧店、柳盒与开盖动画 |
| `src/components/BranchRitual.tsx` | 长按、取消与折枝反馈 |
| `src/lib/wishes.ts` | 本地故事与愿望分类 |
| `src/App.css` | 场景叠层、布局与响应式样式 |
| `public/assets/` | 原始图片和音频 |
| `scripts/verify.mjs` | 浏览器流程检查 |

愿望内容保存在 localStorage，不会上传到服务器；清除浏览器网站数据会删除记录。
