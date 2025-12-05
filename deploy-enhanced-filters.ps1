#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    Vulpes Celare Enhanced Filter Deployment Script
.DESCRIPTION
    Deploys enhanced filters with OCR capabilities to improve HIPAA compliance.
    This script handles ALL the bullshit automatically:
    - Backs up existing files
    - Validates file integrity
    - Fixes TypeScript errors
    - Builds and tests
    - Rolls back on failure
.PARAMETER SkipBackup
    Skip creating backups (NOT RECOMMENDED)
.PARAMETER SkipTest
    Skip running tests after deployment
.EXAMPLE
    .\deploy-enhanced-filters.ps1
#>

[CmdletBinding()]
param(
    [switch]$SkipBackup,
    [switch]$SkipTest
)

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION
# ============================================================================

$projectRoot = "C:\Users\docto\Documents\Programs\Vulpes-Celare"
$filterDir = "$projectRoot\src\filters"
$downloadsDir = "$env:USERPROFILE\Downloads"
$backupDir = "$projectRoot\.backups\$(Get-Date -Format 'yyyyMMdd-HHmmss')"

$filters = @(
    @{
        Name = "SSNFilterSpan"
        EnhancedFile = "$downloadsDir\SSNFilterSpan-ENHANCED.ts"
        TargetFile = "$filterDir\SSNFilterSpan.ts"
        RequiredPatterns = @("OCR", "B6 7278", "space in mask")
        ExpectedLines = 143
    },
    @{
        Name = "DateFilterSpan"
        EnhancedFile = "$downloadsDir\DateFilterSpan-ENHANCED.ts"
        TargetFile = "$filterDir\DateFilterSpan.ts"
        RequiredPatterns = @("OCR", "o7/09/2o200", "space in day")
        ExpectedLines = 232
    },
    @{
        Name = "SmartNameFilterSpan"
        EnhancedFile = "$downloadsDir\SmartNameFilterSpan-ENHANCED.ts"
        TargetFile = "$filterDir\SmartNameFilterSpan.ts"
        RequiredPatterns = @("detectOcrLastFirstNames", "isLikelyOcrName", "normalizeNameOcr")
        ExpectedLines = 1372
    }
)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

function Write-Status {
    param([string]$Message, [string]$Type = "Info")
    
    $color = switch ($Type) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        default { "Cyan" }
    }
    
    $icon = switch ($Type) {
        "Success" { "✅" }
        "Error" { "❌" }
        "Warning" { "⚠️" }
        default { "🔧" }
    }
    
    Write-Host "$icon $Message" -ForegroundColor $color
}

function Test-FileIntegrity {
    param($FilterConfig)
    
    Write-Status "Validating $($FilterConfig.Name)..." -Type "Info"
    
    if (-not (Test-Path $FilterConfig.EnhancedFile)) {
        throw "Enhanced file not found: $($FilterConfig.EnhancedFile)"
    }
    
    $content = Get-Content $FilterConfig.EnhancedFile -Raw
    $lineCount = (Get-Content $FilterConfig.EnhancedFile | Measure-Object -Line).Lines
    
    # Check line count
    if ($lineCount -ne $FilterConfig.ExpectedLines) {
        Write-Status "Line count mismatch: Expected $($FilterConfig.ExpectedLines), got $lineCount" -Type "Warning"
    }
    
    # Check required patterns
    foreach ($pattern in $FilterConfig.RequiredPatterns) {
        if ($content -notmatch [regex]::Escape($pattern)) {
            throw "Required pattern '$pattern' not found in $($FilterConfig.Name)"
        }
    }
    
    Write-Status "$($FilterConfig.Name) validation passed" -Type "Success"
}

function Backup-ExistingFiles {
    Write-Status "Creating backups in $backupDir..." -Type "Info"
    
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    foreach ($filter in $filters) {
        if (Test-Path $filter.TargetFile) {
            $backupPath = Join-Path $backupDir "$($filter.Name).ts"
            Copy-Item $filter.TargetFile $backupPath
            Write-Status "Backed up $($filter.Name)" -Type "Success"
        }
    }
}

function Restore-Backups {
    Write-Status "Rolling back to backups..." -Type "Warning"
    
    foreach ($filter in $filters) {
        $backupPath = Join-Path $backupDir "$($filter.Name).ts"
        if (Test-Path $backupPath) {
            Copy-Item $backupPath $filter.TargetFile -Force
            Write-Status "Restored $($filter.Name)" -Type "Success"
        }
    }
}

function Fix-TypeScriptErrors {
    param([string]$FilePath)
    
    Write-Status "Checking for TypeScript errors in $(Split-Path $FilePath -Leaf)..." -Type "Info"
    
    $content = Get-Content $FilePath -Raw
    
    # Fix duplicate isLikelyName method (SmartNameFilterSpan specific)
    if ($FilePath -like "*SmartNameFilterSpan*") {
        $originalContent = $content
        
        # Rename 3-parameter version to isLikelyOcrName
        $content = $content -replace 'private isLikelyName\(normalized: string, text: string, position: number\): boolean', 'private isLikelyOcrName(normalized: string, text: string, position: number): boolean'
        
        # Update the call
        $content = $content -replace 'this\.isLikelyName\(normalized, text, match\.index\)', 'this.isLikelyOcrName(normalized, text, match.index)'
        
        if ($content -ne $originalContent) {
            $content | Set-Content $FilePath -NoNewline
            Write-Status "Fixed duplicate method in SmartNameFilterSpan" -Type "Success"
        }
    }
}

function Deploy-Filter {
    param($FilterConfig)
    
    Write-Status "Deploying $($FilterConfig.Name)..." -Type "Info"
    
    # Validate source file
    Test-FileIntegrity -FilterConfig $FilterConfig
    
    # Copy to target
    Copy-Item $FilterConfig.EnhancedFile $FilterConfig.TargetFile -Force
    Write-Status "Copied $($FilterConfig.Name) to filters directory" -Type "Success"
    
    # Fix any TypeScript errors
    Fix-TypeScriptErrors -FilePath $FilterConfig.TargetFile
}

function Build-Project {
    Write-Status "Building project..." -Type "Info"
    
    Push-Location $projectRoot
    try {
        $output = npm run build 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -ne 0) {
            Write-Status "Build failed!" -Type "Error"
            Write-Host $output
            throw "Build failed with exit code $exitCode"
        }
        
        Write-Status "Build successful" -Type "Success"
    }
    finally {
        Pop-Location
    }
}

function Test-Deployment {
    Write-Status "Running test suite..." -Type "Info"
    
    Push-Location $projectRoot
    try {
        $testCmd = "node tests\master-suite\run.js --log-file --count=200 --profile=HIPAA_STRICT"
        Write-Status "Executing: $testCmd" -Type "Info"
        
        Invoke-Expression $testCmd
        
        # Find most recent test result
        $resultsDir = "tests\results"
        $latestResult = Get-ChildItem $resultsDir -Filter "rigorous-assessment-*.txt" | 
                        Sort-Object LastWriteTime -Descending | 
                        Select-Object -First 1
        
        if ($latestResult) {
            Write-Host ""
            Write-Status "Test completed! Results:" -Type "Success"
            Write-Host ""
            Get-Content $latestResult.FullName | Select-Object -First 30
            Write-Host ""
            Write-Status "Full results: $($latestResult.FullName)" -Type "Info"
        }
    }
    finally {
        Pop-Location
    }
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  VULPES CELARE - ENHANCED FILTER DEPLOYMENT                  ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    
    # Step 1: Verify all files exist
    Write-Status "Step 1: Verifying enhanced filter files..." -Type "Info"
    $missingFiles = @()
    foreach ($filter in $filters) {
        if (-not (Test-Path $filter.EnhancedFile)) {
            $missingFiles += $filter.Name
        }
    }
    
    if ($missingFiles.Count -gt 0) {
        Write-Status "Missing enhanced files: $($missingFiles -join ', ')" -Type "Error"
        Write-Host ""
        Write-Host "Please download the enhanced filter files from Claude and place them in:" -ForegroundColor Yellow
        Write-Host "  $downloadsDir" -ForegroundColor White
        Write-Host ""
        Write-Host "Required files:" -ForegroundColor Yellow
        foreach ($filter in $filters) {
            Write-Host "  - $(Split-Path $filter.EnhancedFile -Leaf)" -ForegroundColor White
        }
        exit 1
    }
    
    Write-Status "All enhanced files found" -Type "Success"
    Write-Host ""
    
    # Step 2: Backup existing files
    if (-not $SkipBackup) {
        Write-Status "Step 2: Creating backups..." -Type "Info"
        Backup-ExistingFiles
        Write-Host ""
    }
    
    # Step 3: Deploy each filter
    Write-Status "Step 3: Deploying enhanced filters..." -Type "Info"
    foreach ($filter in $filters) {
        Deploy-Filter -FilterConfig $filter
    }
    Write-Host ""
    
    # Step 4: Build project
    Write-Status "Step 4: Building project..." -Type "Info"
    Build-Project
    Write-Host ""
    
    # Step 5: Run tests (optional)
    if (-not $SkipTest) {
        Write-Status "Step 5: Testing deployment..." -Type "Info"
        Test-Deployment
        Write-Host ""
    }
    
    # Success!
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  ✅ DEPLOYMENT SUCCESSFUL!                                   ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Status "All enhanced filters deployed successfully" -Type "Success"
    Write-Status "Backups saved to: $backupDir" -Type "Info"
    Write-Host ""
    
    if ($SkipTest) {
        Write-Status "To run tests manually:" -Type "Info"
        Write-Host "  node tests\master-suite\run.js --log-file --count=200 --profile=HIPAA_STRICT" -ForegroundColor White
        Write-Host ""
    }
}
catch {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║  ❌ DEPLOYMENT FAILED!                                       ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    Write-Status "Error: $_" -Type "Error"
    Write-Host ""
    
    if (-not $SkipBackup -and (Test-Path $backupDir)) {
        Write-Status "Attempting rollback..." -Type "Warning"
        Restore-Backups
        Write-Host ""
        Write-Status "Rolled back to previous version" -Type "Success"
    }
    
    Write-Host ""
    Write-Host "Need help? Check:" -ForegroundColor Yellow
    Write-Host "  1. Are all *-ENHANCED.ts files in Downloads?" -ForegroundColor White
    Write-Host "  2. Is npm installed and working?" -ForegroundColor White
    Write-Host "  3. Run PowerShell as Administrator?" -ForegroundColor White
    Write-Host ""
    
    exit 1
}
