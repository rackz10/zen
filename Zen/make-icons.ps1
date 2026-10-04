# Genera los iconos PNG de Zen (degradado violeta → cian con la letra Z)
# Uso: powershell -ExecutionPolicy Bypass -File make-icons.ps1
Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot "icons"
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

function New-ZenIcon {
    param([int]$Size, [string]$OutPath)

    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Fondo con degradado
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Size, $Size)
    $c1 = [System.Drawing.Color]::FromArgb(255, 124, 92, 255)   # #7C5CFF
    $c2 = [System.Drawing.Color]::FromArgb(255, 56, 200, 255)   # #38C8FF
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, [float]45)
    $g.FillRectangle($brush, $rect)

    # Z dibujada con líneas (sin depender de fuentes)
    $f = $Size / 100.0
    $shadowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, 0, 0, 0), [float](9 * $f))
    $shadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $shadowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $shadowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $whitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [float](9 * $f))
    $whitePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $whitePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $off = [float](2.2 * $f)
    $shadowPts = @(
        (New-Object System.Drawing.PointF([float](32 * $f + $off), [float](32 * $f + $off))),
        (New-Object System.Drawing.PointF([float](68 * $f + $off), [float](32 * $f + $off))),
        (New-Object System.Drawing.PointF([float](32 * $f + $off), [float](68 * $f + $off))),
        (New-Object System.Drawing.PointF([float](68 * $f + $off), [float](68 * $f + $off)))
    )
    $pts = @(
        (New-Object System.Drawing.PointF([float](32 * $f), [float](32 * $f))),
        (New-Object System.Drawing.PointF([float](68 * $f), [float](32 * $f))),
        (New-Object System.Drawing.PointF([float](32 * $f), [float](68 * $f))),
        (New-Object System.Drawing.PointF([float](68 * $f), [float](68 * $f)))
    )
    $g.DrawLines($shadowPen, $shadowPts)
    $g.DrawLines($whitePen, $pts)

    $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Creado: $OutPath"
}

New-ZenIcon -Size 192 -OutPath (Join-Path $dir "icon-192.png")
New-ZenIcon -Size 512 -OutPath (Join-Path $dir "icon-512.png")
New-ZenIcon -Size 180 -OutPath (Join-Path $dir "apple-touch-icon.png")
Write-Host "Listo."
