# ============================================================================
#  serve.ps1 - LIGHT UP, DERURU! 를 내 컴퓨터 안에서만 여는 작은 웹 서버
#  "MV와 함께 실행.bat" 를 더블클릭하면 이 파일이 실행된다. (설치할 것 없음)
#  유튜브 MV 는 파일 더블클릭(file://)으로는 재생이 막혀서, http://localhost 주소로 열어 준다.
#  이 창을 닫으면 서버도 꺼진다.
# ============================================================================
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css';
            '.png'='image/png'; '.webp'='image/webp'; '.jpg'='image/jpeg'; '.mp3'='audio/mpeg';
            '.json'='application/json'; '.md'='text/plain; charset=utf-8' }

$listener = $null; $port = 0
foreach ($p in 8137, 8138, 8139, 8140, 8141) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$p/"); $l.Start(); $listener = $l; $port = $p; break } catch { }
}
if (-not $listener) { Write-Host '서버를 열지 못했어요. 이미 실행 중인 창이 있으면 닫고 다시 해 보세요.'; Read-Host '엔터를 누르면 닫혀요'; exit }

$url = "http://localhost:$port/index.html"
Write-Host ''
Write-Host '  LIGHT UP, DERURU!  실행 중' -ForegroundColor Magenta
Write-Host "  주소 : $url"
Write-Host '  게임하는 동안 이 창은 그대로 두세요. 창을 닫으면 게임 서버가 꺼져요.'
Write-Host ''
try { Start-Process $url } catch { Write-Host '  브라우저가 자동으로 안 열리면 위 주소를 크롬에 붙여 넣으세요.' }

while ($listener.IsListening) {
  $ctx = $listener.GetContext(); $req = $ctx.Request; $res = $ctx.Response
  try {
    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath.TrimStart('/'))
    if ($rel -eq '') { $rel = 'index.html' }
    $file = [IO.Path]::GetFullPath([IO.Path]::Combine($root, $rel))
    if (-not $file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase) -or -not [IO.File]::Exists($file)) {
      $res.StatusCode = 404; $res.Close(); continue
    }
    $ext = [IO.Path]::GetExtension($file).ToLower()
    if ($types.ContainsKey($ext)) { $res.ContentType = $types[$ext] } else { $res.ContentType = 'application/octet-stream' }
    $res.AddHeader('Accept-Ranges', 'bytes')
    $res.AddHeader('Cache-Control', 'no-cache')
    $fs = [IO.File]::OpenRead($file)
    try {
      $len = $fs.Length; $start = 0; $end = $len - 1
      $range = $req.Headers['Range']
      if ($range -and $range -match 'bytes=(\d*)-(\d*)') {
        if ($matches[1] -ne '') { $start = [int64]$matches[1] }
        if ($matches[2] -ne '') { $end = [int64]$matches[2] }
        if ($end -ge $len) { $end = $len - 1 }
        $res.StatusCode = 206
        $res.AddHeader('Content-Range', "bytes $start-$end/$len")
      }
      $res.ContentLength64 = $end - $start + 1
      [void]$fs.Seek($start, 'Begin')
      $buf = New-Object byte[] 65536; $left = $end - $start + 1
      while ($left -gt 0) {
        $n = $fs.Read($buf, 0, [int][Math]::Min($buf.Length, $left)); if ($n -le 0) { break }
        $res.OutputStream.Write($buf, 0, $n); $left -= $n
      }
    } finally { $fs.Close() }
  } catch { } finally { try { $res.Close() } catch { } }
}
