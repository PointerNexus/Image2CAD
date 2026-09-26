# Image2CAD

| | |
|---|---|
| **Repository** | https://github.com/PointerNexus/Image2CAD |
| **Version** | 0.2.0 |
| **Author** | PointerNexus |
| **Licence** | not yet declared |

Turn a raster picture into editable CAD geometry. Point it at a PNG or JPG and
it emits DXF/SCR containing `LINE`, `ARC`, `CIRCLE` and `PLINE` entities —
outer contours, interior detail, and the **centre line** of thick strokes.

The whole app is one self-contained HTML file with no dependencies and no build
step. Open it and it works, including offline and straight from `file://`.

## Why centre lines matter

Naive bitmap tracing walks the outline of every shape, so a 6 px wide line
comes out as **two parallel lines**. That is fine for logos and useless for
laser cutting, CNC, or editing in CAD. This tool measures stroke thickness
(caliper width over the contour), walks the **medial axis** of strokes that are
thin relative to their length, and emits a single line down the middle. Circles
are recovered as `CIRCLE`, circular arcs as a single `ARC`.

## Use it

Open `image2cad.html` in any Chromium-based browser, or Edge. Drop in an image,
press convert, copy or save the result.

Download the Windows build from the Releases page if you would rather not open
a browser — it is a single self-contained `.exe` with no installer.

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
than `file://` so that `navigator.clipboard` is available — the clipboard is a
secure-context API. WebView2 user data is written to
`%LOCALAPPDATA%\Image2CAD`, not next to the exe, so the exe also works from
read-only locations such as `Program Files`.

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
npm test              # assertion suite: 46 of 49 passing
node tests/dbg-diag.mjs   # 35 angle x width combinations of diagonal strokes
node tests/dbg-fit.mjs    # centre line, arc, ring, blob, rect fitting
node tests/dbg-gap.mjs    # corner closure gaps
node tests/dbg-dt.mjs     # distance transform
node tests/dbg-line.mjs   # end-to-end line and arc output
```

`tests/make-e2e.mjs`, `make-layout.mjs` and `make-photo.mjs` write an
instrumented copy of the page with a `#RESULT` probe; open the generated file
and read the element to inspect errors and layout in a real browser.

### Known failures

Three assertions in `tests/core.test.mjs` fail, all the same root cause: a
rasterised rectangle corner is chamfered by one pixel, so in `prim` mode the
outline resolves to 3 or 2 `LINE` entities where 4 are expected.

`tests/dbg-gap.mjs` reports a worst-case corner gap of 3 px on a triangle.
Closure snapping does not yet close it.

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

No licence file yet — see the About table at the top.
