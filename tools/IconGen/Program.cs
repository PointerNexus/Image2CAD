using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Text;

// Renders the app icon at every size Windows asks for and packs the results
// into a multi-resolution .ico. Drawing happens in a fixed 256x256 design
// space, supersampled, so small sizes stay crisp instead of turning to mush.
internal static class Program
{
    private const int Design = 256;
    private const int SuperSample = 4;

    private static readonly Color TileTop = Color.FromArgb(0xFF, 0x1E, 0x2A, 0x3D);
    private static readonly Color TileBottom = Color.FromArgb(0xFF, 0x0B, 0x11, 0x1C);
    private static readonly Color Edge = Color.FromArgb(0xFF, 0x3C, 0x4C, 0x66);
    private static readonly Color Accent = Color.FromArgb(0xFF, 0x22, 0xD3, 0xEE);
    private static readonly Color Node = Color.FromArgb(0xFF, 0xF8, 0xFA, 0xFC);
    private static readonly Color Raster = Color.FromArgb(0xFF, 0x55, 0x66, 0x7E);

    // The CAD polyline: a diagonal run that turns into an axis-aligned leg.
    private static readonly PointF[] Polyline =
    {
        new(64f, 186f),
        new(112f, 140f),
        new(198f, 140f),
    };

    private static readonly (float X, float Y, float S)[] RasterBlocks =
    {
        (46f, 52f, 30f),
        (84f, 52f, 22f),
        (46f, 90f, 22f),
    };

    private static int Main(string[] args)
    {
        string output = args.Length > 0 ? args[0] : "icon.ico";
        int[] sizes = { 16, 20, 24, 32, 40, 48, 64, 128, 256 };

        var frames = new List<(int Size, byte[] Png)>(sizes.Length);
        foreach (int size in sizes)
            frames.Add((size, RenderPng(size)));

        WriteIco(output, frames);

        // A 256px PNG next to the .ico makes the artwork reviewable.
        string preview = Path.ChangeExtension(output, ".png");
        using (var big = Render(256))
            big.Save(preview, ImageFormat.Png);

        Console.WriteLine($"{output}  {new FileInfo(output).Length} bytes, {frames.Count} sizes");
        foreach (var (size, png) in frames)
            Console.WriteLine($"  {size,3}px  {png.Length,6} bytes");
        return 0;
    }

    private static Bitmap Render(int size)
    {
        int big = size * SuperSample;
        var canvas = new Bitmap(big, big, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(canvas))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);
            DrawDesign(g, big, size);
        }

        if (big == size) return canvas;

        var final = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(final))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.CompositingQuality = CompositingQuality.HighQuality;
            g.DrawImage(canvas, new Rectangle(0, 0, size, size));
        }
        canvas.Dispose();
        return final;
    }

    private static void DrawDesign(Graphics g, int big, int size)
    {
        float k = big / (float)Design;
        bool detail = size >= 32;

        // --- tile -----------------------------------------------------------
        var tile = new RectangleF(6f * k, 6f * k, (Design - 12) * k, (Design - 12) * k);
        float radius = 58f * k;

        using (var brush = new LinearGradientBrush(
                   new RectangleF(0, 0, big, big), TileTop, TileBottom, LinearGradientMode.Vertical))
        using (GraphicsPath clip = RoundedRect(tile, radius))
        {
            g.FillPath(brush, clip);

            using var pen = new Pen(Edge, Math.Max(1f, 3f * k));
            g.DrawPath(pen, clip);
        }

        // --- raster hint (only where there is room to read it) ---------------
        if (detail)
        {
            using var brush = new SolidBrush(Raster);
            foreach (var (x, y, s) in RasterBlocks)
                g.FillRectangle(brush, x * k, y * k, s * k, s * k);
        }

        // --- CAD polyline ----------------------------------------------------
        using (var path = new GraphicsPath())
        {
            path.AddLines(Polyline.Select(p => new PointF(p.X * k, p.Y * k)).ToArray());
            using var pen = new Pen(Accent, (detail ? 21f : 26f) * k)
            {
                StartCap = LineCap.Round,
                EndCap = LineCap.Round,
                LineJoin = LineJoin.Round,
            };
            g.DrawPath(pen, path);
        }

        // --- vertex nodes ----------------------------------------------------
        using (var brush = new SolidBrush(Node))
        {
            float r = (detail ? 17f : 21f) * k;
            foreach (var p in Polyline.Skip(1))
            {
                float cx = p.X * k, cy = p.Y * k;
                g.FillEllipse(brush, cx - r, cy - r, r * 2, r * 2);
            }
        }
    }

    private static GraphicsPath RoundedRect(RectangleF r, float radius)
    {
        float d = radius * 2;
        if (d > r.Width) d = r.Width;
        if (d > r.Height) d = r.Height;
        radius = d / 2;

        var p = new GraphicsPath();
        p.AddArc(r.X, r.Y, d, d, 180, 90);
        p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        p.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        p.CloseFigure();
        return p;
    }

    private static byte[] RenderPng(int size)
    {
        using Bitmap bmp = Render(size);
        using var ms = new MemoryStream();
        bmp.Save(ms, ImageFormat.Png);
        return ms.ToArray();
    }

    /// <summary>
    /// Minimal multi-image .ico writer. Every entry is PNG-compressed, which
    /// Windows Vista and later (so every Windows 10/11 target) read natively.
    /// </summary>
    private static void WriteIco(string path, List<(int Size, byte[] Png)> frames)
    {
        using var fs = new FileStream(path, FileMode.Create, FileAccess.Write);
        using var w = new BinaryWriter(fs);

        w.Write((ushort)0);            // reserved
        w.Write((ushort)1);            // type: icon
        w.Write((ushort)frames.Count);

        int offset = 6 + 16 * frames.Count;
        foreach (var (size, png) in frames)
        {
            w.Write((byte)(size >= 256 ? 0 : size));
            w.Write((byte)(size >= 256 ? 0 : size));
            w.Write((byte)0);          // palette size
            w.Write((byte)0);          // reserved
            w.Write((ushort)1);        // colour planes
            w.Write((ushort)32);       // bits per pixel
            w.Write(png.Length);
            w.Write(offset);
            offset += png.Length;
        }

        foreach (var (_, png) in frames)
            w.Write(png);
    }
}
