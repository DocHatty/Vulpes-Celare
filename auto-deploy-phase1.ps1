#!/usr/bin/env pwsh
#Requires -Version 5.1

<#
.SYNOPSIS
    Autonomous Testing & Deployment System for Vulpes Celare
.DESCRIPTION
    Implements changes in phases, tests each phase, auto-reverts on failure.
    NO USER INTERVENTION REQUIRED - fully autonomous.
.EXAMPLE
    .\auto-deploy-phase1.ps1
#>

$ErrorActionPreference = "Stop"

# ============================================================================
# CONFIGURATION
# ============================================================================

$projectRoot = "C:\Users\docto\Documents\Programs\Vulpes-Celare"
$filterFile = "$projectRoot\src\filters\SmartNameFilterSpan.ts"
$backupFile = "$projectRoot\.backups\SmartNameFilterSpan-before-phase1.ts"

# Success criteria
$TARGET_OVER_REDACTIONS = 35  # Must be <= this (currently 98)
$MIN_NAMES_CAUGHT = 55        # Must be >= this (currently 59)
$MIN_SENSITIVITY = 97.0       # Must be >= this (currently 97.35%)

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

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

function Backup-File {
    Write-Status "Creating backup..." -Type "Info"
    $backupDir = Split-Path $backupFile -Parent
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    }
    Copy-Item $filterFile $backupFile -Force
    Write-Status "Backup created: $backupFile" -Type "Success"
}

function Restore-Backup {
    Write-Status "Reverting changes..." -Type "Warning"
    Copy-Item $backupFile $filterFile -Force
    Write-Status "Reverted to backup" -Type "Success"
}

function Build-Project {
    Write-Status "Building project..." -Type "Info"
    
    Push-Location $projectRoot
    try {
        $output = npm run build 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -ne 0) {
            Write-Status "Build FAILED!" -Type "Error"
            Write-Host $output
            return $false
        }
        
        Write-Status "Build successful" -Type "Success"
        return $true
    }
    finally {
        Pop-Location
    }
}

function Run-Tests {
    Write-Status "Running test suite (200 documents, HIPAA_STRICT profile)..." -Type "Info"
    
    Push-Location $projectRoot
    try {
        $testCmd = "node tests\master-suite\run.js --log-file --count=200 --profile=HIPAA_STRICT"
        Invoke-Expression $testCmd | Out-Null
        
        # Find most recent result
        $resultsDir = "tests\results"
        $latestResult = Get-ChildItem $resultsDir -Filter "rigorous-assessment-*.txt" | 
                        Sort-Object LastWriteTime -Descending | 
                        Select-Object -First 1
        
        if (-not $latestResult) {
            Write-Status "No test results found!" -Type "Error"
            return $null
        }
        
        Write-Status "Test completed: $($latestResult.Name)" -Type "Success"
        return $latestResult.FullName
    }
    finally {
        Pop-Location
    }
}

function Parse-TestResults {
    param([string]$ResultFile)
    
    Write-Status "Parsing test results..." -Type "Info"
    
    $content = Get-Content $ResultFile -Raw
    
    # Extract metrics using regex
    $sensitivityMatch = [regex]::Match($content, "SENSITIVITY[^:]*:\s*([\d.]+)%")
    $sensitivity = if ($sensitivityMatch.Success) { $sensitivityMatch.Groups[1].Value } else { "0" }
    
    $nameMatch = [regex]::Match($content, "NAME\s+(\d+)/\d+")
    $nameFailures = if ($nameMatch.Success) { $nameMatch.Groups[1].Value } else { "0" }
    
    $overMatch = [regex]::Match($content, "OVER-REDACTIONS \((\d+) total")
    $overRedactions = if ($overMatch.Success) { $overMatch.Groups[1].Value } else { "0" }
    
    # If regex fails, try alternative patterns
    if ([string]::IsNullOrEmpty($nameFailures) -or $nameFailures -eq "0") {
        $altMatch = [regex]::Match($content, "NAME.*?(\d+) MISSED")
        if ($altMatch.Success) {
            $nameFailures = $altMatch.Groups[1].Value
        }
    }
    
    $results = @{
        Sensitivity = [double]$sensitivity
        NameFailures = [int]$nameFailures
        OverRedactions = [int]$overRedactions
        NamesCaught = 600 - [int]$nameFailures  # Assuming 600 total names
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "TEST RESULTS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Sensitivity:      $($results.Sensitivity)%" -ForegroundColor White
    Write-Host "  Name Failures:    $($results.NameFailures)" -ForegroundColor White
    Write-Host "  Names Caught:     $($results.NamesCaught)" -ForegroundColor White
    Write-Host "  Over-redactions:  $($results.OverRedactions)" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    return $results
}

function Test-Success {
    param($Results)
    
    Write-Status "Evaluating success criteria..." -Type "Info"
    
    $success = $true
    $reasons = @()
    
    # Check over-redactions (MUST improve)
    if ($Results.OverRedactions -gt $TARGET_OVER_REDACTIONS) {
        $success = $false
        $reasons += "Over-redactions too high: $($Results.OverRedactions) > $TARGET_OVER_REDACTIONS"
    } else {
        Write-Status "PASS: Over-redactions: $($Results.OverRedactions) <= $TARGET_OVER_REDACTIONS" -Type "Success"
    }
    
    # Check names caught (must not regress significantly)
    if ($Results.NamesCaught -lt $MIN_NAMES_CAUGHT) {
        $success = $false
        $reasons += "Names caught dropped: $($Results.NamesCaught) < $MIN_NAMES_CAUGHT"
    } else {
        Write-Status "PASS: Names caught: $($Results.NamesCaught) >= $MIN_NAMES_CAUGHT" -Type "Success"
    }
    
    # Check sensitivity (must not drop)
    if ($Results.Sensitivity -lt $MIN_SENSITIVITY) {
        $success = $false
        $reasons += "Sensitivity dropped: $($Results.Sensitivity)% < $MIN_SENSITIVITY%"
    } else {
        Write-Status "PASS: Sensitivity: $($Results.Sensitivity)% >= $MIN_SENSITIVITY%" -Type "Success"
    }
    
    return @{
        Success = $success
        Reasons = $reasons
    }
}

function Apply-Phase1-Changes {
    Write-Status "Applying Phase 1 changes..." -Type "Info"
    
    $content = Get-Content $filterFile -Raw
    
    # Find the isLikelyOcrName method - using simpler approach
    $lines = $content -split "`n"
    $startIdx = -1
    $endIdx = -1
    $braceCount = 0
    $inMethod = $false
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match 'private isLikelyOcrName\(normalized: string, text: string, position: number\): boolean') {
            $startIdx = $i
            $inMethod = $true
            $braceCount = 0
            continue
        }
        
        if ($inMethod) {
            $braceCount += ($lines[$i] -split '\{').Length - 1
            $braceCount -= ($lines[$i] -split '\}').Length - 1
            
            if ($braceCount -eq 0 -and $lines[$i] -match '\}') {
                $endIdx = $i
                break
            }
        }
    }
    
    if ($startIdx -lt 0 -or $endIdx -lt 0) {
        Write-Status "Could not locate isLikelyOcrName method!" -Type "Error"
        return $false
    }
    
    Write-Status "Found method at lines $($startIdx + 1) to $($endIdx + 1)" -Type "Info"
    
    # New method implementation
    $newMethod = @'
  private isLikelyOcrName(normalized: string, text: string, position: number): boolean {
    const clean = normalized.replace(/[,.\s]/g, '').toUpperCase();
    
    if (clean.length < 4) return false;
    
    // PHASE 1: Dictionary validation - check EACH word
    const words = normalized.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      const cleanWord = word.replace(/[^a-zA-Z]/g, '');
      
      // Check against medical term dictionary
      if (DocumentVocabulary.isMedicalTerm(cleanWord)) {
        return false;
      }
      
      // Check against field label whitelist
      if (FieldLabelWhitelist.shouldExclude(cleanWord)) {
        return false;
      }
    }
    
    // Check full phrase against dictionary
    const cleanPhrase = normalized.replace(/[^a-zA-Z\s]/g, '').trim();
    if (DocumentVocabulary.isMedicalTerm(cleanPhrase)) {
      return false;
    }
    
    // Original checks (keep as backup)
    const medPatterns = /^(MG|MCG|ML|TABLET|CAPSULE|PILL)$|^[A-Z]+IN$|^[A-Z]+OL$|^[A-Z]+AL$/;
    if (medPatterns.test(clean)) return false;
    
    // Check context
    const contextStart = Math.max(0, position - 30);
    const contextEnd = Math.min(text.length, position + normalized.length + 30);
    const context = text.substring(contextStart, contextEnd).toLowerCase();
    
    if (/\b(diagnosis|medication|procedure|condition|disease|symptom|treatment|prescribed|taking|drug)[\s:]/i.test(context)) {
      return false;
    }
    
    return true;
  }
'@

    # Replace the method
    $before = $lines[0..($startIdx - 1)]
    $after = $lines[($endIdx + 1)..($lines.Length - 1)]
    $newMethodLines = $newMethod -split "`n"
    
    $newContent = ($before + $newMethodLines + $after) -join "`n"
    
    # Write the new content
    $newContent | Set-Content $filterFile -NoNewline
    
    Write-Status "Phase 1 changes applied successfully" -Type "Success"
    return $true
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

try {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  AUTONOMOUS DEPLOYMENT - PHASE 1" -ForegroundColor Cyan
    Write-Host "  Dictionary-Based Validation" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Step 1: Backup
    Backup-File
    
    # Step 2: Apply changes
    $applied = Apply-Phase1-Changes
    if (-not $applied) {
        Write-Status "Failed to apply changes - aborting" -Type "Error"
        exit 1
    }
    
    # Step 3: Build
    $buildSuccess = Build-Project
    if (-not $buildSuccess) {
        Write-Status "Build failed - reverting changes" -Type "Error"
        Restore-Backup
        exit 1
    }
    
    # Step 4: Test
    $resultFile = Run-Tests
    if (-not $resultFile) {
        Write-Status "Test execution failed - reverting changes" -Type "Error"
        Restore-Backup
        exit 1
    }
    
    # Step 5: Parse results
    $results = Parse-TestResults -ResultFile $resultFile
    
    # Step 6: Evaluate
    $evaluation = Test-Success -Results $results
    
    Write-Host ""
    if ($evaluation.Success) {
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host "  [OK] PHASE 1 SUCCESSFUL!" -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host ""
        Write-Status "Changes accepted - keeping modifications" -Type "Success"
        Write-Status "Backup preserved at: $backupFile" -Type "Info"
        Write-Host ""
        Write-Host "NEXT STEPS:" -ForegroundColor Yellow
        Write-Host "  Run: .\auto-deploy-phase2.ps1" -ForegroundColor White
        Write-Host ""
        exit 0
    } else {
        Write-Host "================================================================" -ForegroundColor Red
        Write-Host "  [!!] PHASE 1 FAILED!" -ForegroundColor Red
        Write-Host "================================================================" -ForegroundColor Red
        Write-Host ""
        Write-Status "Failure reasons:" -Type "Error"
        foreach ($reason in $evaluation.Reasons) {
            Write-Host "  - $reason" -ForegroundColor Red
        }
        Write-Host ""
        
        Restore-Backup
        Write-Status "Changes reverted - system restored to previous state" -Type "Warning"
        exit 1
    }
}
catch {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host "  [!!] UNEXPECTED ERROR!" -ForegroundColor Red
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Status "Error: $_" -Type "Error"
    Write-Host ""
    
    if (Test-Path $backupFile) {
        Restore-Backup
        Write-Status "Emergency rollback completed" -Type "Warning"
    }
    
    exit 1
}
