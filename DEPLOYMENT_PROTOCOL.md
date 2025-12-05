# CRITICAL DEPLOYMENT PROTOCOL
## READ THIS BEFORE EVERY FILE MODIFICATION TASK

═══════════════════════════════════════════════════════════════════
CORE PRINCIPLE: KISS - KEEP IT SIMPLE, STUPID
═══════════════════════════════════════════════════════════════════

When the user asks to modify code and test it:

1. **MAKE THE EDIT** using Filesystem:edit_file
2. **TELL USER TO RUN**: npm run build && node tests/whatever
3. **DONE**

DO NOT:
❌ Create "autonomous deployment scripts" that do the editing for you
❌ Write PowerShell scripts that try to be smart about finding/replacing code
❌ Over-engineer "validation pipelines" 
❌ Build "rollback systems" that break the original fix
❌ Promise "zero intervention" when you can't execute on user's machine
❌ Create multiple layers of automation that fight each other

═══════════════════════════════════════════════════════════════════
THE DISASTER THAT MUST NEVER HAPPEN AGAIN
═══════════════════════════════════════════════════════════════════

WHAT HAPPENED (December 5, 2024):
1. Claude used Filesystem:edit_file correctly ✅
2. Claude then created a PowerShell script to "automate everything"
3. PowerShell script did its own broken regex replacement ❌
4. PowerShell script UNDID Claude's correct edit ❌
5. Build failed, script reverted, user got angry
6. Happened TWICE in a row because Claude didn't learn

LESSON: Don't create scripts that do file editing when you can already do file editing directly!

═══════════════════════════════════════════════════════════════════
THE RIGHT WAY - ALWAYS
═══════════════════════════════════════════════════════════════════

USER: "Fix the validation function and test it"

CLAUDE RESPONSE:
```
[Uses Filesystem:edit_file to make the change]

Done! The edit is applied. Now run:

npm run build
node tests/master-suite/run.js --log-file --count=200 --profile=HIPAA_STRICT

Let me know the results.
```

That's it. Clean. Simple. Works.

═══════════════════════════════════════════════════════════════════
WHEN TO CREATE SCRIPTS
═══════════════════════════════════════════════════════════════════

✅ CREATE scripts for:
- Repetitive tasks the user will run multiple times
- Complex multi-step processes that are STABLE
- Build automation, test runners, deployment pipelines
- Things that DON'T involve modifying source code dynamically

❌ DON'T CREATE scripts for:
- One-time file edits
- "Autonomous" systems that try to replace your own tools
- Anything that duplicates functionality you already have
- Things that add complexity without clear benefit

═══════════════════════════════════════════════════════════════════
EMERGENCY RULES
═══════════════════════════════════════════════════════════════════

If you catch yourself thinking:
- "Let me create a script that will make the edits autonomously..."
- "I'll build a validation system that auto-reverts..."
- "This needs multiple layers of automation..."

STOP. Re-read this document. Use Filesystem:edit_file and give the user simple commands.

═══════════════════════════════════════════════════════════════════
REMEMBER
═══════════════════════════════════════════════════════════════════

The user is a brilliant developer who WANTS to run commands.
The user DOES NOT want you to over-engineer solutions.
The user DOES NOT want "autonomous" systems that break.
The user WANTS you to make precise edits and get out of the way.

RESPECT THE USER'S TIME.
RESPECT THE USER'S INTELLIGENCE.
KEEP IT FUCKING SIMPLE.
