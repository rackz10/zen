# Servidor HTTP estático mínimo para probar Zen en local
# Uso: powershell -ExecutionPolicy Bypass -File serve.ps1
$root = $PSScriptRoot
$prefix = 'http://localhost:8757/'
$types = @{
  '.html'       = 'text/html; charset=utf-8'
  '.css'        = 'text/css; charset=utf-8'
  '.js'         = 'application/javascript; charset=utf-8'
  '.svg'        = 'image/svg+xml'
  '.png'        = 'image/png'
  '.webmanifest'= 'application/manifest+json'
  '.json'       = 'application/json'
  '.md'         = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "Sirviendo Zen en $prefix (Ctrl+C para detener)"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $path = $ctx.Request.Url.LocalPath
    if ($path -eq '/' -or $path -eq '') { $path = '/index.html' }
    $file = Join-Path $root ($path.TrimStart('/').Replace('/', '\'))
    if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($types.ContainsKey($ext)) { $ctx.Response.ContentType = $types[$ext] }
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $msg = [System.Text.Encoding]::UTF8.GetBytes('No encontrado')
      $ctx.Response.StatusCode = 404
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
  } catch {
    $msg = [System.Text.Encoding]::UTF8.GetBytes('Error')
    $ctx.Response.StatusCode = 500
    try { $ctx.Response.OutputStream.Write($msg, 0, $msg.Length) } catch {}
  }
  $ctx.Response.Close()
}
