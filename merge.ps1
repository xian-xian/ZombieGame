$tmpDir = ".\temp_clips";
if (Test-Path $tmpDir) { Remove-Item -Recurse -Force$tmpDir };
$null = New-Item -ItemType Directory -Path$tmpDir -Force;

$headers = @{
    "Referer"    = "https://www.mlb.com/"
    "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

$rawLines = Get-Content -Path "list.txt";
$localList = @();$i = 1;

foreach ($line in $rawLines) {$url = $line -replace "^file\s+'?", "" -replace "'?$", "";
    if ($url -match "^http") {
        $outFile = "$tmpDir\clip_$i.mp4";
        Write-Host "正在抓取第 $i 個片段..." -ForegroundColor Cyan;
        Invoke-WebRequest -Uri $url -Headers $headers -OutFile$outFile;
        $localList += "file 'clip_$i.mp4'";
        $i++;
    }
};

Set-Content -Path "$tmpDir\local_list.txt" -Value $localList -Encoding ascii;
ffmpeg -y -f concat -safe 0 -i "$tmpDir\local_list.txt" -c copy output.mp4;

if (Test-Path "output.mp4") {
    Remove-Item -Recurse -Force $tmpDir;
    Write-Host "`n✅ 合併成功！output.mp4 已生成在 C:\MLB 資料夾內。" -ForegroundColor Green;
} else {
    Write-Host "`n❌ 合併失敗，請檢查上方訊息。" -ForegroundColor Red;
};
