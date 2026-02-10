# ============================================
# Kay AI (Kabyar) - Vercel Agentic Deploy Script
# ============================================
# Usage: Run after "vercel login" completes
# .\scripts\vercel-deploy.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectRoot

# Ensure Node/npm in PATH
$env:Path = "C:\Program Files\nodejs;" + $env:APPDATA + "\npm;" + $env:Path

Write-Host "`n=== Kay AI Vercel Deploy ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot`n"

# Step 1: Check login
Write-Host "[1/4] Checking Vercel login..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Not logged in. Run 'vercel login' first." -ForegroundColor Red
    exit 1
}
Write-Host "Logged in as: $whoami" -ForegroundColor Green

# Step 2: Link project (if not already)
if (-not (Test-Path ".vercel\project.json")) {
    Write-Host "`n[2/4] Linking project to Vercel..." -ForegroundColor Yellow
    vercel link --yes
    if ($LASTEXITCODE -ne 0) { exit 1 }
} else {
    Write-Host "`n[2/4] Project already linked." -ForegroundColor Green
}

# Step 3: Push env vars from .env to Vercel
if (Test-Path ".env") {
    Write-Host "`n[3/4] Pushing environment variables to Vercel..." -ForegroundColor Yellow
    $envLines = Get-Content ".env" -Encoding UTF8 -Raw
    $count = 0
    $tempDir = [System.IO.Path]::GetTempPath()
    foreach ($line in ($envLines -split "`n")) {
        $line = $line.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $eq = $line.IndexOf("=")
            if ($eq -gt 0) {
                $name = $line.Substring(0, $eq).Trim()
                $value = $line.Substring($eq + 1).Trim()
                # Remove surrounding quotes
                if ($value.Length -ge 2) {
                    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                        $value = $value.Substring(1, $value.Length - 2).Replace('\"','"')
                    }
                }
                if ($name -and $value -and $name -ne "NODE_ENV") {
                    $tempFile = Join-Path $tempDir "vercel_env_$([guid]::NewGuid().ToString('N')).tmp"
                    try {
                        [System.IO.File]::WriteAllText($tempFile, $value, [System.Text.Encoding]::UTF8)
                        cmd /c "vercel env add $name production --force < `"$tempFile`"" 2>$null
                        cmd /c "vercel env add $name preview --force < `"$tempFile`"" 2>$null
                        $count++
                        Write-Host "  + $name" -ForegroundColor DarkGray
                    } catch { }
                    finally {
                        if (Test-Path $tempFile) { Remove-Item $tempFile -Force -ErrorAction SilentlyContinue }
                    }
                }
            }
        }
    }
    Write-Host "  Pushed $count variables to production & preview." -ForegroundColor Green
} else {
    Write-Host "`n[3/4] No .env file found - skipping env push." -ForegroundColor Yellow
}

# Step 4: Deploy
Write-Host "`n[4/4] Deploying to Vercel production..." -ForegroundColor Yellow
vercel --prod --yes
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nDeploy FAILED." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Deploy SUCCESS ===" -ForegroundColor Green
Write-Host "Check your Vercel dashboard for the live URL." -ForegroundColor Cyan
