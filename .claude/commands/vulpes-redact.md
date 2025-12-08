# Vulpes PHI Redaction

Redact PHI from the provided text using Vulpes Celare.

## Usage
`/vulpes-redact <text to redact>`

## Instructions
1. Take the text provided in $ARGUMENTS
2. Use the redact_text tool to process it
3. Show the redacted output with a summary of what was found
4. If no arguments provided, ask the user to paste text

## Example
Input: "Patient John Smith DOB 01/15/1990 SSN 123-45-6789"
Output: "Patient [NAME] DOB [DATE] SSN [SSN]"
