# 生成各尺寸 PNG，再由 Node (to-ico) 合成为标准 ICO
Add-Type -AssemblyName System.Drawing

function Add-RoundedRect {
    param(
        [System.Drawing.Drawing2D.GraphicsPath]$Path,
        [single]$X, [single]$Y, [single]$W, [single]$H, [single]$R
    )
    $d = $R * 2
    if ($d -gt $W) { $R = $W / 2; $d = $W }
    if ($d -gt $H) { $R = $H / 2; $d = $H }
    $Path.AddArc($X, $Y, $d, $d, 180, 90)
    $Path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
    $Path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
    $Path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
    $Path.CloseFigure()
}

function New-GamepadBitmap {
    param([int]$Size)

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

    $green = [System.Drawing.Color]::FromArgb(255, 40, 167, 69)
    $g.Clear($green)

    $s = [single]$Size
    $pad = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $mark = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 30, 130, 55))

    $body = New-Object System.Drawing.Drawing2D.GraphicsPath
    Add-RoundedRect -Path $body -X (0.22 * $s) -Y (0.34 * $s) -W (0.56 * $s) -H (0.28 * $s) -R (0.14 * $s)
    $gripL = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gripL.AddEllipse(0.14 * $s, 0.48 * $s, 0.22 * $s, 0.28 * $s)
    $gripR = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gripR.AddEllipse(0.64 * $s, 0.48 * $s, 0.22 * $s, 0.28 * $s)
    # 分开 Fill，避免 AddPath 偶偶规则在重叠处抠洞
    $g.FillPath($pad, $body)
    $g.FillPath($pad, $gripL)
    $g.FillPath($pad, $gripR)

    if ($Size -ge 48) {
        $u = [Math]::Max(2, [int]($s * 0.028))
        $cx = 0.36 * $s
        $cy = 0.52 * $s
        $g.FillRectangle($mark, ($cx - $u), ($cy - 3 * $u), (2 * $u), (6 * $u))
        $g.FillRectangle($mark, ($cx - 3 * $u), ($cy - $u), (6 * $u), (2 * $u))

        $bx = 0.68 * $s
        $by = 0.52 * $s
        $r = [Math]::Max(2, [int]($s * 0.022))
        $g.FillEllipse($mark, ($bx - $r), ($by - 2.2 * $r), (2 * $r), (2 * $r))
        $g.FillEllipse($mark, ($bx + 1.3 * $r), ($by - $r), (2 * $r), (2 * $r))
        $g.FillEllipse($mark, ($bx - $r), ($by + 1.1 * $r), (2 * $r), (2 * $r))
        $g.FillEllipse($mark, ($bx - 2.3 * $r), ($by - $r), (2 * $r), (2 * $r))
    }
    elseif ($Size -ge 24) {
        $g.FillRectangle($mark, (0.30 * $s), (0.48 * $s), (0.08 * $s), (0.08 * $s))
        $g.FillRectangle($mark, (0.62 * $s), (0.48 * $s), (0.08 * $s), (0.08 * $s))
    }

    $body.Dispose(); $gripL.Dispose(); $gripR.Dispose()
    $pad.Dispose(); $mark.Dispose()
    $g.Dispose()
    return $bmp
}

$iconDir = Join-Path $env:LOCALAPPDATA 'GuGeeGoo'
$tmpDir = Join-Path $iconDir 'icon-png'
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null
$iconPath = Join-Path $iconDir 'gugeegoo-game.ico'

$sizes = @(16, 24, 32, 48, 64, 128, 256)
foreach ($sz in $sizes) {
    $bmp = New-GamepadBitmap -Size $sz
    $png = Join-Path $tmpDir ("gamepad-$sz.png")
    $bmp.Save($png, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$repoRoot = Split-Path $PSScriptRoot -Parent
$nodeScript = Join-Path $PSScriptRoot 'pack-game-icon.mjs'
node $nodeScript $tmpDir $iconPath
Write-Output $iconPath
