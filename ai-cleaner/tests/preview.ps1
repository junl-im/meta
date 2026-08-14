param(
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Prefix = "http://127.0.0.1:$Port/"

function Get-ContentType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.js'   { return 'text/javascript; charset=utf-8' }
    '.mjs'  { return 'text/javascript; charset=utf-8' }
    '.css'  { return 'text/css; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.svg'  { return 'image/svg+xml' }
    '.png'  { return 'image/png' }
    '.jpg'  { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.webp' { return 'image/webp' }
    '.wasm' { return 'application/wasm' }
    default { return 'application/octet-stream' }
  }
}

function Send-Response($Stream, [int]$Status, [string]$StatusText, [byte[]]$Body, [string]$ContentType) {
  $header = "HTTP/1.1 $Status $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
  $headerBytes = [Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  if ($Body.Length -gt 0) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try {
  $listener.Start()
} catch {
  Write-Host "[AI Cleaner] 포트 $Port 를 열 수 없습니다." -ForegroundColor Red
  Write-Host $_.Exception.Message
  Read-Host 'Enter를 누르면 종료합니다'
  exit 1
}

Write-Host ''
Write-Host 'AI Cleaner local preview' -ForegroundColor Cyan
Write-Host "Root : $Root"
Write-Host "URL  : ${Prefix}tests/"
Write-Host '종료하려면 이 창에서 Ctrl+C를 누르세요.' -ForegroundColor Yellow
Write-Host ''

Start-Process "${Prefix}tests/"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 4096, $true)
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }
      do { $line = $reader.ReadLine() } while ($null -ne $line -and $line -ne '')

      $parts = $requestLine.Split(' ')
      if ($parts.Length -lt 2 -or $parts[0] -ne 'GET') {
        $body = [Text.Encoding]::UTF8.GetBytes('Method Not Allowed')
        Send-Response $stream 405 'Method Not Allowed' $body 'text/plain; charset=utf-8'
        continue
      }

      $rawPath = $parts[1].Split('?')[0]
      $decodedPath = [Uri]::UnescapeDataString($rawPath).Replace('/', [IO.Path]::DirectorySeparatorChar)
      $relative = $decodedPath.TrimStart([IO.Path]::DirectorySeparatorChar)
      if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
      $candidate = [IO.Path]::GetFullPath((Join-Path $Root $relative))

      if (-not $candidate.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
        $body = [Text.Encoding]::UTF8.GetBytes('Forbidden')
        Send-Response $stream 403 'Forbidden' $body 'text/plain; charset=utf-8'
        continue
      }
      if ([IO.Directory]::Exists($candidate)) { $candidate = Join-Path $candidate 'index.html' }
      if (-not [IO.File]::Exists($candidate)) {
        $body = [Text.Encoding]::UTF8.GetBytes('Not Found')
        Send-Response $stream 404 'Not Found' $body 'text/plain; charset=utf-8'
        continue
      }

      $bytes = [IO.File]::ReadAllBytes($candidate)
      Send-Response $stream 200 'OK' $bytes (Get-ContentType $candidate)
    } catch {
      try {
        $body = [Text.Encoding]::UTF8.GetBytes('Internal Server Error')
        Send-Response $stream 500 'Internal Server Error' $body 'text/plain; charset=utf-8'
      } catch {}
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
