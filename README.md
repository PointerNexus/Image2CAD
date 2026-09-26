<h1 align="center">Image2CAD</h1>
<p align="center">
  <b>Raster image &rarr; editable CAD geometry</b><br>
  <sub>LINE &middot; ARC &middot; CIRCLE &middot; PLINE &nbsp;&mdash;&nbsp; one self-contained HTML file, zero dependencies</sub>
</p>
<p align="center">
  <a href="https://github.com/PointerNexus/Image2CAD/releases/download/v0.2.0/Image2CAD-0.2.0.exe">
    <img alt="Download Image2CAD for Windows" src="https://img.shields.io/badge/%E2%9A%99%20Download-Image2CAD%20%E2%80%93%20Windows-111827?style=for-the-badge">
  </a>
  <a href="https://github.com/PointerNexus/Image2CAD/releases">
    <img alt="All releases" src="https://img.shields.io/badge/releases-0.2.0-6b7280?style=for-the-badge">
  </a>
</p>
<p align="center">
  <a href="#why-centre-lines-matter">Why centre lines</a> &middot;
  <a href="#use-it">Use it</a> &middot;
  <a href="#build-the-windows-exe">Build</a> &middot;
  <a href="#tests">Tests</a> &middot;
  <a href="#how-it-works">How it works</a>
</p>

---

Point it at a PNG or JPG and it emits DXF/SCR containing `LINE`, `ARC`, `CIRCLE`
and `PLINE` entities &mdash; outer contours, interior detail, and the **centre
line** of thick strokes.

The whole app is one HTML file with no dependencies and no build step. Open it
and it works, including offline and straight from `file://`.

| | |
|---|---|
| **Version** | 0.2.0 |
| **Author** | PointerNexus |
| **Repository** | <https://github.com/PointerNexus/Image2CAD> |
| **Licence** | not yet declared |

## Download

Grab a prebuilt executable from the
[releases page](https://github.com/PointerNexus/Image2CAD/releases) &mdash; a
single self-contained `.exe`, no installer, nothing to uninstall:

| Release | Asset | Notes |
|---|---|---|
| [v0.2.0](https://github.com/PointerNexus/Image2CAD/releases/tag/v0.2.0) | [`Image2CAD-0.2.0.exe`](https://github.com/PointerNexus/Image2CAD/releases/download/v0.2.0/Image2CAD-0.2.0.exe) | current, has the in-app About panel |
| [v0.1.0](https://github.com/PointerNexus/Image2CAD/releases/tag/v0.1.0) | [`Image2CAD-0.1.0.exe`](https://github.com/PointerNexus/Image2CAD/releases/download/v0.1.0/Image2CAD-0.1.0.exe) | first public build |

First run unpacks the runtime into `%LOCALAPPDATA%\Image2CAD`. The exe also
works from read-only locations such as `Program Files`.

If you would rather not install anything, just open
[`image2cad.html`](image2cad.html) from the repository in any Chromium-based
browser or Edge.

## Why centre lines matter

Naive bitmap tracing walks the outline of every shape, so a 6 px wide line
comes out as **two parallel lines**. That is fine for logos and useless for
laser cutting, CNC, or editing in CAD. This tool measures stroke thickness
(caliper width over the contour), walks the **medial axis** of strokes that are
thin relative to their length, and emits a single line down the middle. Circles
are recovered as `CIRCLE`, circular arcs as a single `ARC`.

| Input | Emitted |
|---|---|
| straight stroke | `LINE` |
| circular arc | `ARC` |
| circle or ring | `CIRCLE` |
| closed outline | `PLINE` in `pline` mode, `prim` entities by default |

## Use it

Open `image2cad.html` in Edge or Chrome. Drop in an image, press convert, then
copy the result to the clipboard or save it. The header has an **About** button
listing the repository, version and author.

## Build the Windows exe

Requires the [.NET 9 SDK](https://dotnet.microsoft.com/download). The wrapper
hosts the page in a WebView2 window and needs the
[WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/),
which ships with Windows 10 and 11.

```sh
cd packaging
dotnet publish -c Release -o ./out
```

That produces `out/Image2CAD.exe`, roughly 48 MB, carrying the .NET runtime
and the page inside it. The page is embedded from the repository root, so after
editing `image2cad.html` a rebuild is all that is needed.

The page is served from a virtual host (`https://app.image2cad.local`) rather
than `file://` so that `navigator.clipboard` is available &mdash; the clipboard
is a secure-context API. WebView2 user data is written to
`%LOCALAPPDATA%\Image2CAD`, not next to the exe.

### Icon

`packaging/icon.ico` holds nine sizes (16 through 256). The artwork is
generated, not hand-drawn:

```sh
cd tools/IconGen
dotnet run -c Release -- ../../packaging/icon.ico
```

Edit the colour constants and geometry at the top of `Program.cs` to restyle
it. A 256 px `icon.png` preview is written alongside the `.ico`.

## Tests

No dependencies beyond Node 18+.

```sh
npm test              # 49 assertions
npm run test:all      # versions + diag + dt + fit + gap + core
```

| Script | Covers |
|---|---|
| `npm test` | the core assertion suite |
| `npm run test:versions` | app version matches `package.json`, repo url matches the git remote |
| `npm run test:diag` | 35 angle &times; width combinations of diagonal strokes |
| `npm run test:fit` | centre line, arc, ring, blob and rect fitting |
| `npm run test:gap` | corner closure gaps |
| `npm run test:dt` | distance transform |
| `npm run test:line` | end-to-end line and arc output |
| `npm run test:about` | drives the About panel in headless Edge, 19 checks |

`test:about` measures the About button's contrast from `getComputedStyle`
rather than trusting a hardcoded ratio, so it fails if the button is ever
softened back into the grey chrome.

`tests/make-e2e.mjs`, `make-layout.mjs` and `make-photo.mjs` write an
instrumented copy of the page with a `#RESULT` probe; open the generated file
and read the element to inspect errors and layout in a real browser.

> [!NOTE]
> **46 of 49** core assertions pass. The three failures share one root cause: a
> rasterised rectangle corner is chamfered by a pixel, so in `prim` mode the
> outline resolves to 3 or 2 `LINE` entities where 4 are expected.
>
> `npm run test:gap` reports a worst-case corner gap of 3 px on a triangle.
> Closure snapping does not close it yet.

## How it works

```
image
  -> toGray -> boxBlur -> otsu -> binarize   threshold on the blurred image
  -> traceContours                            Moore-neighbour boundary walk
  -> caliper widths                           thickness per contour
  -> distance transform + medial axis        centre line of thick strokes
  -> RDP + segmentize                         split into LINE / ARC runs
  -> Kasa circle fit                          CIRCLE for round shapes
  -> DXF / SCR writer
```

Thinning the threshold stage matters: running Otsu on the *unblurred* image
turns smooth anti-aliased edges into speckle and inflates the entity count.

## Layout

```
image2cad.html          the entire application
packaging/              .NET 9 + WebView2 single-file exe wrapper
tools/IconGen/          generates packaging/icon.ico
tests/                  Node test scripts, no dependencies
```

## Licence

No licence file yet, which means the default: all rights reserved. Say the word
and I will add one &mdash; MIT is the usual choice for a tool like this.
