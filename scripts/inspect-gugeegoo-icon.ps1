Add-Type -AssemblyName System.Drawing
$iconPath = Join-Path $env:LOCALAPPDATA 'GuGeeGoo\gugeegoo-game.ico'
$outDir = Join-Path $env:LOCALAPPDATA 'GuGeeGoo\icon-debug'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Output "File: $iconPath"
Write-Output "Bytes: $((Get-Item $iconPath).Length)"

$bytes = [IO.File]::ReadAllBytes($iconPath)
$count = [BitConverter]::ToUInt16($bytes, 4)
Write-Output "Embedded images in ICO: $count"
for ($i = 0; $i -lt $count; $i++) {
    $o = 6 + ($i * 16)
    $w = $bytes[$o]; if ($w -eq 0) { $w = 256 }
    $h = $bytes[$o + 1]; if ($h -eq 0) { $h = 256 }
    Write-Output "  #$i ${w}x${h}"
}

foreach ($s in @(16, 32, 48, 256)) {
    $icon = New-Object Drawing.Icon $iconPath, $s, $s
    $bmp = $icon.ToBitmap()
    $p = Join-Path $outDir "desktop-preview-$s.png"
    $bmp.Save($p, [Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $icon.Dispose()
}
Write-Output "Previews: $outDir"
