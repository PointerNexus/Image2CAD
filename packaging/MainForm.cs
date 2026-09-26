using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Image2Cad;

/// <summary>
/// Shell that hosts the single-file image2cad page in a WebView2 window.
/// The page itself is embedded as a resource, so the published exe needs no
/// side-car files.
/// </summary>
internal sealed class MainForm : Form
{
    private const string HtmlResource = "Image2Cad.app.image2cad.html";
    private const string VirtualHost = "app.image2cad.local";

    private readonly WebView2 _web = new() { Dock = DockStyle.Fill };

    public MainForm()
    {
        Text = "图片转 CAD 指令";
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(1280, 860);
        MinimumSize = new Size(900, 620);
        BackColor = Color.FromArgb(0x1e, 0x1e, 0x1e);
        Controls.Add(_web);
        Shown += OnShown;
    }

    private async void OnShown(object? sender, EventArgs e)
    {
        try
        {
            string root = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Image2Cad");
            Directory.CreateDirectory(root);

            // The page is a single self-contained file, so materialising it once
            // is enough; skip the write when the cached copy is already current.
            string page = Path.Combine(root, "image2cad.html");
            byte[] html = ReadResource(HtmlResource);
            if (!File.Exists(page) || !SameBytes(File.ReadAllBytes(page), html))
                File.WriteAllBytes(page, html);

            string userData = Path.Combine(root, "webview");
            Directory.CreateDirectory(userData);

            var env = await CoreWebView2Environment.CreateAsync(null, userData);
            await _web.EnsureCoreWebView2Async(env);

            var settings = _web.CoreWebView2.Settings;
            settings.AreHostObjectsAllowed = false;
            settings.IsStatusBarEnabled = false;
            settings.IsZoomControlEnabled = true;

            var cwv = _web.CoreWebView2;
            // A virtual host gives the page a real https origin. It matters for
            // navigator.clipboard, which is only exposed in a secure context,
            // and it keeps blob downloads off file:// quirks.
            cwv.SetVirtualHostNameToFolderMapping(
                VirtualHost, root, CoreWebView2HostResourceAccessKind.DenyCors);
            cwv.NewWindowRequested += (_, a) => a.Handled = true;

            cwv.DownloadStarting += OnDownloadStarting;

            cwv.Navigate("https://" + VirtualHost + "/image2cad.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                this,
                "启动失败：\r\n\r\n" + ex.Message,
                "图片转 CAD",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    /// <summary>
    /// The page exports through a blob URL plus a[download]. WebView2 does not
    /// write those anywhere unless a target is supplied, so route it to a normal
    /// save dialog.
    /// </summary>
    private void OnDownloadStarting(object? sender, CoreWebView2DownloadStartingEventArgs e)
    {
        void Save(string path)
        {
            e.ResultFilePath = path;
            // Handled = false lets WebView2 perform the transfer to ResultFilePath.
        }

        using var dlg = new SaveFileDialog
        {
            Title = "保存 CAD 文件",
            FileName = Path.GetFileName(e.ResultFilePath) is { Length: > 0 } n ? n : "output.dxf",
            Filter = "CAD 文件 (*.dxf;*.txt;*.scr)|*.dxf;*.txt;*.scr|所有文件 (*.*)|*.*",
        };

        if (dlg.ShowDialog(this) == DialogResult.OK) Save(dlg.FileName);
        else e.Cancel = true;
    }

    private static byte[] ReadResource(string name)
    {
        using Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name)
            ?? throw new InvalidOperationException("缺少嵌入资源：" + name);
        using var ms = new MemoryStream();
        s.CopyTo(ms);
        return ms.ToArray();
    }

    private static bool SameBytes(byte[] a, byte[] b)
    {
        if (a.Length != b.Length) return false;
        for (int i = 0; i < a.Length; i++)
            if (a[i] != b[i]) return false;
        return true;
    }
}
