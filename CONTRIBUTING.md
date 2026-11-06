# 参与一愿柳

感谢你愿意改进这个项目。可以从一个显示问题、一句不自然的文案，或一次不顺手的交互开始。

## 提交问题

请在 [Issues](https://github.com/Rosatus/onewishwillow/issues) 中写明：

- 设备、操作系统和浏览器版本。
- 从打开页面到问题发生的操作步骤。
- 预期行为与实际结果。
- 相关截图或浏览器控制台报错。截图前请隐去不希望公开的愿望内容。

如果涉及开盖、长按或折枝动画，附上短视频会更容易定位。

## 本地开发

```bash
git clone https://github.com/Rosatus/onewishwillow.git
cd onewishwillow
npm ci
npm run dev
```

使用 Node.js 22.12+ 或 24+。外部贡献者请先 Fork 仓库，在自己的分支上提交改动，再创建 Pull Request。

## 修改约定

- 一次 PR 聚焦一个问题，说明修改前后的行为。
- 保持中文提示简短、直接。故事优先用具体事件推进，避免反复解释氛围。
- 修改交互时兼顾鼠标、触屏与键盘；保留中途取消和减少动态效果的行为。
- 不要提交 `node_modules/`、`dist/`、`artifacts/`、本地凭据或个人数据。
- 新增素材时注明来源和许可，保留适用的第三方声明。

## 验证改动

代码修改至少运行：

```bash
npm run build
```

涉及布局、状态切换或用户操作时，再运行：

```bash
npx playwright install chromium
npm run verify
```

检查 `artifacts/` 中的截图和报告。脚本检查通过后，仍需确认画面符合预期；桌面与手机布局都应查看。

纯文档修改只需核对事实、命令、链接和图片路径，无需重跑交互检查。

## 提交 Pull Request

描述应包含修改目的、用户可见的变化和已完成的验证。视觉变化请附修改前后的截图；暂时未验证的部分请直接说明。

提交的原创贡献按本仓库的 [AGPL-3.0-only 协议](LICENSE) 提供。第三方内容请保留其适用许可和来源说明。
