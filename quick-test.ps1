#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    Simple build and test script - NO FILE EDITING
.DESCRIPTION
    Just builds and tests. Assumes changes are already made.
#>

$ErrorActionPreference = "Stop"

$projectRoot = "C:\Users\docto\Documents\Programs\Vulpes-Celare"

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    $timestamp = Get-Date -Format "HH:mm:ss"
    $color = switch ($Type) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        default { "Cyan" }
    }
    $icon = switch ($Type) {
        "Success" { "[OK]" }
        "Error" { "[!!]" }
        "Warning" { "[**]" }
        default { "[--]" }
    }
    Write-Host "[$timestamp] $icon $Message" -ForegroundColor $color
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  BUILD AND TEST - PHASE 1" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Build
Write-Status "Building project..." -Type "Info"
Push-Location $projectRoot
try {
    $output = npm run build 2>&1 | Out-String
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -ne 0) {
        Write-Status "Build FAILED!" -Type "Error"
        Write-Host $output
        exit 1
    }
    
    Write-Status "Build successful" -Type "Success"
}
finally {
    Pop-Location
}

# Test
Write-Status "Running test suite (200 documents)..." -Type "Info"
Push-Location $projectRoot
try {
    $testCmd = "node tests\master-suite\run.js --log-file --count=200 --profile=HIPAA_STRICT"
    Invoke-Expression $testCmd | Out-Null
    
    $resultsDir = "tests\results"
    $latestResult = Get-ChildItem $resultsDir -Filter "rigorous-assessment-*.txt" | 
                    Sort-Object LastWriteTime -Descending | 
                    Select-Object -First 1
    
    if (-not $latestResult) {
        Write-Status "No test results found!" -Type "Error"
        exit 1
    }
    
    Write-Status "Test completed: $($latestResult.Name)" -Type "Success"
    Write-Host ""
    Write-Host "Results file: $($latestResult.FullName)" -ForegroundColor Yellow
}
finally {
    Pop-Location
}
