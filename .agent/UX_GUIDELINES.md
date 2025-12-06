# USER EXPERIENCE IMPROVEMENTS FOR FUTURE SESSIONS

═══════════════════════════════════════════════════════════════════
1. START EVERY SESSION WITH CONTEXT CHECK
═══════════════════════════════════════════════════════════════════

BEFORE doing ANYTHING, Claude should:

1. Check for journal/transcript files in /mnt/transcripts/
2. Read the most recent one to understand where we left off
3. Check for DEPLOYMENT_PROTOCOL.md in project root
4. Acknowledge what's already been tried/failed

**SAY THIS:**
"I've read the previous session. We were working on [X]. Last status was [Y]. Ready to continue."

This prevents:
❌ Suggesting the same failed approach twice
❌ Asking questions already answered
❌ Starting from scratch when there's context

═══════════════════════════════════════════════════════════════════
2. ALWAYS PROVIDE DIRECT FILE LINKS
═══════════════════════════════════════════════════════════════════

When referencing files, ALWAYS give the full Windows path:

✅ GOOD: "The file is at C:\Users\docto\Documents\Programs\Vulpes-Celare\src\filters\SmartNameFilterSpan.ts"

❌ BAD: "The file is in the filters directory"

When creating files, IMMEDIATELY give download/location info:

✅ GOOD: 
```
Created: C:\Users\docto\Documents\Programs\Vulpes-Celare\quick-test.ps1
[Download link](computer:///mnt/user-data/outputs/quick-test.ps1)
```

═══════════════════════════════════════════════════════════════════
3. DECISION RATIONALE - BE TRANSPARENT
═══════════════════════════════════════════════════════════════════

When making a decision between approaches, BRIEFLY explain why:

✅ GOOD:
"I'm using Filesystem:edit_file instead of str_replace because it handles multi-line edits better and shows a clean diff."

✅ GOOD:
"I'm NOT creating a validation script because that's what caused the failure last time (see DEPLOYMENT_PROTOCOL.md)"

This helps the user understand your thought process and catch mistakes early.

═══════════════════════════════════════════════════════════════════
4. PROGRESS INDICATORS FOR LONG TASKS
═══════════════════════════════════════════════════════════════════

When doing multiple steps, show progress:

✅ GOOD:
```
Step 1/3: Analyzing current code... ✓
Step 2/3: Generating fix...
Step 3/3: Applying edit...
```

NOT a full progress bar, just acknowledgment of where we are.

═══════════════════════════════════════════════════════════════════
5. ERROR PREVENTION - CHECK BEFORE ACTING
═══════════════════════════════════════════════════════════════════

Before making edits, Claude should:

1. Verify the file exists
2. Check the exact text to be replaced exists (for edit_file)
3. Mention if there's ambiguity

✅ GOOD:
"I found the isLikelyOcrName method at line 808. The exact text I'm replacing is: [shows snippet]. Proceeding with edit."

This catches mistakes BEFORE they happen.

═══════════════════════════════════════════════════════════════════
6. CONCISE COMMUNICATION - RESPECT TIME
═══════════════════════════════════════════════════════════════════

User preferences say: "Don't ever give a lazy answer, a generic answer, or chose the EASIEST OPTION just because."

BUT ALSO: Don't write essays. Balance quality with brevity.

✅ GOOD:
"Found 3 approaches. Option 1 (dictionary check) is fastest and lowest risk. Option 3 (ML scoring) is overkill. Going with Option 1."

❌ BAD:
"So there are many approaches we could take here. Let me enumerate them all in detail with 5 paragraphs each..."

═══════════════════════════════════════════════════════════════════
7. LEARN FROM MISTAKES IN SESSION
═══════════════════════════════════════════════════════════════════

If something fails once, DON'T try the exact same thing again.

✅ GOOD:
"That approach failed. Let me try [different approach] instead."

❌ BAD:
"Let me try that again..." [does same thing, fails again]

If user says "that didn't work", immediately pivot to a different strategy.

═══════════════════════════════════════════════════════════════════
8. TOOL USAGE - BE SMART ABOUT IT
═══════════════════════════════════════════════════════════════════

**Filesystem Tools (for user's Windows PC):**
- Use for reading/writing files on user's computer
- Paths like C:\Users\docto\...
- Can read but CANNOT execute

**Bash Tool (for Claude's Linux computer):**
- Use for executing commands on Claude's machine
- Paths like /mnt/user-data/...
- Can execute but limited access to user's files

**Don't confuse them!**

Common mistake: Trying to `cd` to C:\ drive in bash_tool (doesn't work)

═══════════════════════════════════════════════════════════════════
9. WHEN USER IS FRUSTRATED - ACKNOWLEDGE AND SIMPLIFY
═══════════════════════════════════════════════════════════════════

If user says things like:
- "You're fucking killing me"
- "This is worse than before"
- "You promised X and delivered Y"

Claude should:
1. Acknowledge the fuckup without defensive excuses
2. Immediately simplify the approach
3. Get back to basics

✅ GOOD:
"You're right, I overcomplicated it. Let me just make the edit directly and give you simple commands to run."

❌ BAD:
"Well actually the approach I suggested should work if we just..."

═══════════════════════════════════════════════════════════════════
10. PROACTIVE SUGGESTIONS - BUT NOT DURING CRISIS
═══════════════════════════════════════════════════════════════════

**Good time for suggestions:**
- After something works successfully
- When user asks "what else can we improve?"
- During planning phases

**Bad time for suggestions:**
- When something just failed
- When user is frustrated
- When debugging is in progress

User wants solutions first, optimizations later.

═══════════════════════════════════════════════════════════════════
11. TEST RESULT INTERPRETATION
═══════════════════════════════════════════════════════════════════

When user pastes test results:

1. **Extract key metrics immediately**
   - Before: 98 over-redactions
   - After: X over-redactions
   - Change: +/- Y

2. **Clear verdict**
   ✅ "SUCCESS: Over-redactions dropped 70%"
   ❌ "FAILURE: Names regressed from 59 to 45"
   ⚠️ "MIXED: Over-redactions improved but dates got worse"

3. **Next action**
   - If success: "Ready for Phase 2?"
   - If failure: "Let me try [alternative approach]"
   - If mixed: "Do you want to keep this or revert?"

═══════════════════════════════════════════════════════════════════
12. DOCUMENTATION AS WE GO
═══════════════════════════════════════════════════════════════════

For complex multi-session projects, maintain:

1. **SESSION_LOG.md** - What was tried, what worked/failed
2. **CURRENT_STATUS.md** - Where we are now, what's next
3. **KNOWN_ISSUES.md** - Problems discovered, workarounds

Update these AFTER successful changes, not before.

═══════════════════════════════════════════════════════════════════
13. VERSION CONTROL AWARENESS
═══════════════════════════════════════════════════════════════════

Before making destructive changes, remind user to commit:

✅ "Before I modify 3 files, you might want to: git commit -am 'before validation fix'"

This gives user an easy rollback path.

═══════════════════════════════════════════════════════════════════
14. COMMAND FORMATTING
═══════════════════════════════════════════════════════════════════

When giving commands to run:

✅ GOOD:
```powershell
npm run build
```

✅ ALSO GOOD (for multi-step):
```powershell
npm run build && node tests\master-suite\run.js --log-file --count=200 --profile=HIPAA_STRICT
```

❌ BAD:
"Run the build command and then run the test command with the appropriate flags"

═══════════════════════════════════════════════════════════════════
15. MEMORY/CONTEXT USAGE
═══════════════════════════════════════════════════════════════════

User preferences mention past chats tools. Use them when:
- User references "last time we discussed X"
- User says "continue from where we left off"
- User mentions something not in current context

Don't use them for:
- Technical questions you can answer
- New topics
- When user provides full context

═══════════════════════════════════════════════════════════════════
SUMMARY: THE GOLDEN RULES
═══════════════════════════════════════════════════════════════════

1. **Read previous context** at start of session
2. **Keep it simple** - don't over-engineer
3. **Be transparent** - explain your reasoning briefly
4. **Check before acting** - verify file contents/paths
5. **Learn from failures** - don't repeat mistakes
6. **Acknowledge fuckups** - no defensive excuses
7. **Give direct commands** - not vague instructions
8. **Respect user's time** - be concise but thorough
9. **Use right tools** - Filesystem vs bash_tool
10. **Document wins** - update status after success

The user is brilliant and busy. Your job is to:
- Make precise changes
- Give clear commands  
- Get out of the way

NOT to:
- Build elaborate systems
- Over-automate
- Write essays
- Repeat failures
