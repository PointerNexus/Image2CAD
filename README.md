<h1 align="center">Image2CAD</h1>
<p align="center">
  <b>把图片变成能编辑的 CAD 线条</b><br>
  <sub>Turn a raster picture into editable CAD geometry &mdash; LINE &middot; ARC &middot; CIRCLE &middot; PLINE</sub>
</p>
<p align="center">
  <a href="https://github.com/PointerNexus/Image2CAD/releases/download/v0.2.0/Image2CAD-0.2.0.exe">
    <img alt="Download Image2CAD for Windows" src="https://img.shields.io/badge/%E2%9A%99%20Download-Image2CAD%20%E2%80%93%20Windows-2563eb?style=for-the-badge">
  </a>
  <a href="https://github.com/PointerNexus/Image2CAD/releases">
    <img alt="All releases" src="https://img.shields.io/badge/%F0%9F%93%85%20All%20releases-a855f7?style=for-the-badge">
  </a>
  <a href="#%E4%B8%8B%E8%BD%BD">
    <img alt="Source and build instructions" src="https://img.shields.io/badge/%F0%9F%94%A5%20Source-34d399?style=for-the-badge">
  </a>
</p>
<p align="center">
  <img alt="version 0.2.0" src="https://img.shields.io/badge/version-0.2.0-3b82f6?style=flat-square">
  <img alt="platform Windows and Chromium" src="https://img.shields.io/badge/platform-Windows%20%7C%20Chromium-0ea5e9?style=flat-square">
  <img alt="single HTML file" src="https://img.shields.io/badge/one_HTML_file-8b5cf6?style=flat-square">
  <img alt="no dependencies" src="https://img.shields.io/badge/dependencies-none-16a34a?style=flat-square">
  <img alt="offline capable" src="https://img.shields.io/badge/offline-22c55e?style=flat-square">
  <img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-10b981?style=flat-square">
</p>

---

## 这是什么

给它一张 PNG 或 JPG，它还给你一堆**能在 CAD 里直接选中、编辑**的线条和圆弧 —— 可以拿去激光切割、数控加工，或者接着改。

关键差别在这儿：大多数描图工具会把一条 6 像素粗的线描成**两条平行线**，出来的东西没法用。这个工具会先量出线的粗细，再算出**中心线**，只给你一条。圆还是 `CIRCLE`，圆弧是完整的一根 `ARC`。

整个程序就是**一个 HTML 文件**，双击就能用，不用装环境，断网也能跑。

## What this is

Give it a PNG or JPG and it hands back `LINE`, `ARC`, `CIRCLE` and `PLINE`
entities you can select and edit in CAD &mdash; ready for laser cutting, CNC, or
further editing.

The part that actually matters: most tracers turn a 6 px stroke into **two
parallel lines**, which is useless downstream. This one measures how thick the
stroke is and emits a single **centre line** instead. Circles come back as
`CIRCLE`, arcs as one unbroken `ARC`.

The whole program is **one HTML file**. Double-click it and it runs &mdash; no
install, no dependencies, works offline.

| | |
|---|---|
| **Version** | 0.2.0 |
| **Author** | PointerNexus |
| **Repository** | <https://github.com/PointerNexus/Image2CAD> |
| **Licence** | [MIT](LICENSE) |

## 为什么是中心线

描图工具的原理是沿着每个形状的**外轮廓**走一遍，所以一条 6 像素宽的线会被描出两条边
—— 画 logo 够了，做 CNC 完全不行。

这个工具先用卡尺宽度量出每条轮廓的厚度，对那些「相对于长度足够细」的笔画走一遍**中轴
（medial axis）**，取最中间的那条线输出。圆识别成 `CIRCLE`，圆弧拟合成单根 `ARC`。

| 输入 | 输出 |
|---|---|
| 直线笔画 | `LINE` |
| 圆弧 | `ARC` |
| 圆 / 圆环 | `CIRCLE` |
| 封闭轮廓 | `pline` 模式下为 `PLINE`，默认 `prim` 模式下拆成基本图元 |

## 下载

从 [releases 页面](https://github.com/PointerNexus/Image2CAD/releases) 直接拿编译好的
exe —— 单文件、免安装、卸载时删掉一个目录就完事：

| 版本 | 文件 | 说明 |
|---|---|---|
| [v0.2.0](https://github.com/PointerNexus/Image2CAD/releases/tag/v0.2.0) | [`Image2CAD-0.2.0.exe`](https://github.com/PointerNexus/Image2CAD/releases/download/v0.2.0/Image2CAD-0.2.0.exe) | 当前版本，带「关于」面板 |
| [v0.1.0](https://github.com/PointerNexus/Image2CAD/releases/tag/v0.1.0) | [`Image2CAD-0.1.0.exe`](https://github.com/PointerNexus/Image2CAD/releases/download/v0.1.0/Image2CAD-0.1.0.exe) | 首个公开版本 |

首次运行会把运行时解压到 `%LOCALAPPDATA%\Image2CAD`。exe 放在只读目录（比如
`Program Files`）里也能正常跑。

不想装任何东西的话，直接用浏览器打开仓库里的
[`image2cad.html`](image2cad.html) 就行。

## 使用

用 Edge 或 Chrome 打开 `image2cad.html`，拖进一张图，点转换，然后复制结果或保存。
右上角有个**「关于」**按钮，里面是仓库地址、版本号和作者。

## 编译 Windows 版

需要 [.NET 9 SDK](https://dotnet.microsoft.com/download)。外壳程序用 WebView2 窗口
承载页面，依赖 [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)，
Win10 和 Win11 都自带。

```sh
cd packaging
dotnet publish -c Release -o ./out
```

产物是 `out/Image2CAD.exe`，约 48 MB，.NET 运行时和页面都打进去了。页面从仓库根目录
嵌入，所以改完 `image2cad.html` 重新编译一次就行。

页面走的是虚拟主机（`https://app.image2cad.local`）而不是 `file://`，因为剪贴板
`navigator.clipboard` 只在安全上下文可用。WebView2 的用户数据写在
`%LOCALAPPDATA%\Image2CAD`，不放在 exe 旁边。

### 图标

`packaging/icon.ico` 包含 9 种尺寸（16 到 256），图形是代码生成的，不是手画的：

```sh
cd tools/IconGen
dotnet run -c Release -- ../../packaging/icon.ico
```

改 `Program.cs` 顶部的颜色常量和几何参数就能换风格，旁边会同时输出一张 256 像素的
`icon.png` 预览。

## 测试

除了 Node 18+ 之外不需要任何依赖。

```sh
npm test              # 49 条断言
npm run test:all      # versions + diag + dt + fit + gap + core
```

| 命令 | 覆盖内容 |
|---|---|
| `npm test` | 核心断言集 |
| `npm run test:versions` | 应用版本与 `package.json` 一致、仓库地址与 git remote 一致 |
| `npm run test:diag` | 35 组「角度 × 线宽」的斜线组合 |
| `npm run test:fit` | 中心线、圆弧、圆环、blob、矩形的拟合 |
| `npm run test:gap` | 转角闭合缺口 |
| `npm run test:dt` | 距离变换 |
| `npm run test:line` | 直线与圆弧的端到端输出 |
| `npm run test:about` | 在无头 Edge 里驱动「关于」面板，19 项检查 |

`test:about` 的对比度是从 `getComputedStyle` 实际算出来的，不是写死的数字，所以按钮
哪天被调回灰色混入界面，测试会直接失败。

`tests/make-e2e.mjs`、`make-layout.mjs`、`make-photo.mjs` 会生成一份带 `#RESULT`
探针的页面副本，用浏览器打开读那个元素就能在真实环境里查错误和布局。

> [!NOTE]
> 核心断言 **49 条过 46 条**。这 3 条失败是同一个原因：栅格化出来的矩形转角被削掉了
> 一个像素，`prim` 模式下轮廓变成 3 条或 2 条 `LINE`，而预期是 4 条。
>
> `npm run test:gap` 报告三角形转角最坏还有 3 px 缺口，闭合吸附暂时没能合上。

## 工作原理

```
image
  -> toGray -> boxBlur -> otsu -> binarize   在模糊后的图上取阈值
  -> traceContours                            Moore 邻域边界追踪
  -> caliper widths                           每条轮廓的粗细
  -> distance transform + medial axis        粗笔画的中心线
  -> RDP + segmentize                         切成 LINE / ARC 段
  -> Kasa circle fit                          圆形识别为 CIRCLE
  -> DXF / SCR writer
```

阈值这一段要放在模糊之后：直接在**未模糊**的图上跑 Otsu，会把平滑的抗锯齿边缘打成
麻点，实体数量跟着虚高。

## 目录结构

```
image2cad.html          整个应用
packaging/              .NET 9 + WebView2 单文件 exe 外壳
tools/IconGen/          生成 packaging/icon.ico
tests/                  Node 测试脚本，零依赖
```

## 许可

[MIT](LICENSE) &mdash; 别人可以随便用、随便改、包括拿去商用和二次分发，唯一的要求是
在副本里保留这份版权声明。

换句话说，别人可以把你这个工具嵌进他自己的商业软件里，也可以 fork 了一份自己改，这都
没问题。
