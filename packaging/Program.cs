using System;
using System.Runtime.InteropServices;

namespace Image2Cad;

internal static class Program
{
    [DllImport("kernel32.dll")]
    private static extern bool SetProcessDpiAwarenessContext(IntPtr value);

    [STAThread]
    private static void Main()
    {
        // Per-monitor v2 so the vector canvas stays crisp on scaled displays.
        // Must be set before any window is created.
        try { SetProcessDpiAwarenessContext(new IntPtr(-4)); } catch { }

        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}
