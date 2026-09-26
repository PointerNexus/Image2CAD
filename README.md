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

| 输入 | 输出 |
|---|---|
| 直线笔画 | `LINE` |
| 圆弧 | `ARC` |
| 圆 / 圆环 | `CIRCLE` |
| 封闭轮廓 | `pline` 模式下为 `PLINE`，默认 `prim` 模式下拆成基本图元 |

## What this is

Give it a PNG or JPG and it hands back `LINE`, `ARC`, `CIRCLE` and `PLINE`
entities you can select and edit in CAD &mdash; ready for laser cutting, CNC, or
further editing.

| | |
|---|---|
| **Version** | 0.2.0 |
| **Author** | PointerNexus |
| **Repository** | <https://github.com/PointerNexus/Image2CAD> |
| **Licence** | [MIT](LICENSE) |

## 下载

从 [releases 页面](https://github.com/PointerNexus/Image2CAD/releases) 获取已编译的可执行
文件：

| 版本 | 文件 | 说明 |
|---|---|---|
| [v0.2.0](https://github.com/PointerNexus/Image2CAD/releases/tag/v0.2.0) | [`Image2CAD-0.2.0.exe`](https://github.com/PointerNexus/Image2CAD/releases/download/v0.2.0/Image2CAD-0.2.0.exe) | 当前版本，带「关于」面板 |
| [v0.1.0](https://github.com/PointerNexus/Image2CAD/releases/tag/v0.1.0) | [`Image2CAD-0.1.0.exe`](https://github.com/PointerNexus/Image2CAD/releases/download/v0.1.0/Image2CAD-0.1.0.exe) | 首个公开版本 |

如果你不想装任何东西，可以尝试直接打开仓库里的
[`image2cad.html`](image2cad.html)。

## 编译 Windows 版

需要 [.NET 9 SDK](https://dotnet.microsoft.com/download)。外壳程序用 WebView2 窗口
承载页面，依赖 [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/)，
Win10 和 Win11 都自带。

```sh
cd packaging
dotnet publish -c Release -o ./out
```

产物为 `out/Image2CAD.exe`，约 48 MB，其中已包含 .NET 运行时与页面资源。页面自仓库根目录
嵌入，修改 `image2cad.html` 后重新编译即可生效。

页面由虚拟主机 `https://app.image2cad.local` 承载，而非 `file://`，因为剪贴板接口
`navigator.clipboard` 仅在安全上下文中可用。WebView2 的用户数据写入
`%LOCALAPPDATA%\Image2CAD`，不存放于可执行文件所在目录。

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

`test:about` 的对比度数值由 `getComputedStyle` 在渲染后实际计算得出，而非硬编码常量；
若该按钮被改回灰色并与界面混同，测试将直接失败。

`tests/make-e2e.mjs`、`make-layout.mjs`、`make-photo.mjs` 生成带 `#RESULT` 探针的页面副本，
在浏览器中打开并读取该元素，即可在真实环境中检查错误与布局。

> [!NOTE]
> 核心断言 **49 条中通过 46 条**。3 条失败源于同一原因：栅格化后的矩形转角缺失一个像素，
> `prim` 模式下轮廓解析为 3 条或 2 条 `LINE`，预期为 4 条。
>
> `npm run test:gap` 报告三角形转角最大残留 3 px 缺口，闭合吸附尚未完全消除该偏差。

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

阈值计算必须置于模糊之后：若直接在**未模糊**图像上执行 Otsu，平滑的抗锯齿边缘会被量化为
离散噪点，导致实体数量虚高。

## 目录结构

```
image2cad.html          整个应用
packaging/              .NET 9 + WebView2 单文件 exe 外壳
tests/                  Node 测试脚本，零依赖
```

## 许可

本项目采用 [MIT](LICENSE) 协议发布。

授权范围包括使用、复制、修改、合并、发布、分发、再许可及销售本软件的全部或部分副本，并
允许将本软件用于商业用途。唯一的附加义务为保留版权声明与许可声明：上述授权涉及的任何副本
或实质性部分，均须包含本许可声明。

本软件按「现状」提供，不附带任何明示或默示的担保，包括但不限于对适销性与特定用途适用性
的担保。作者不对使用本软件所导致的任何损失承担责任。
