\---

name: systematic-debugging

description: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes

\---



\# Systematic Debugging



\## Overview



Random fixes waste time and create new bugs. Quick patches mask underlying issues.



\*\*Core principle:\*\* ALWAYS find root cause before attempting fixes. Symptom fixes are failure.



\*\*Violating the letter of this process is violating the spirit of debugging.\*\*



\## The Iron Law



```

NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST

```



If you haven't completed Phase 1, you cannot propose fixes.



\## When to Use



Use for ANY technical issue:

\- Test failures

\- Bugs in production

\- Unexpected behavior

\- Performance problems

\- Build failures

\- Integration issues



\*\*Use this ESPECIALLY when:\*\*

\- Under time pressure (emergencies make guessing tempting)

\- "Just one quick fix" seems obvious

\- You've already tried multiple fixes

\- Previous fix didn't work

\- You don't fully understand the issue



\*\*Don't skip when:\*\*

\- Issue seems simple (simple bugs have root causes too)

\- You're in a hurry (rushing guarantees rework)

\- Manager wants it fixed NOW (systematic is faster than thrashing)



\## The Four Phases



You MUST complete each phase before proceeding to the next.



\### Phase 1: Root Cause Investigation



\*\*BEFORE attempting ANY fix:\*\*



1\. \*\*Read Error Messages Carefully\*\*

&#x20;  - Don't skip past errors or warnings

&#x20;  - They often contain the exact solution

&#x20;  - Read stack traces completely

&#x20;  - Note line numbers, file paths, error codes



2\. \*\*Reproduce Consistently\*\*

&#x20;  - Can you trigger it reliably?

&#x20;  - What are the exact steps?

&#x20;  - Does it happen every time?

&#x20;  - If not reproducible → gather more data, don't guess



3\. \*\*Check Recent Changes\*\*

&#x20;  - What changed that could cause this?

&#x20;  - Git diff, recent commits

&#x20;  - New dependencies, config changes

&#x20;  - Environmental differences



4\. \*\*Gather Evidence in Multi-Component Systems\*\*



&#x20;  \*\*WHEN system has multiple components (CI → build → signing, API → service → database):\*\*



&#x20;  \*\*BEFORE proposing fixes, add diagnostic instrumentation:\*\*

&#x20;  ```

&#x20;  For EACH component boundary:

&#x20;    - Log what data enters component

&#x20;    - Log what data exits component

&#x20;    - Verify environment/config propagation

&#x20;    - Check state at each layer



&#x20;  Run once to gather evidence showing WHERE it breaks

&#x20;  THEN analyze evidence to identify failing component

&#x20;  THEN investigate that specific component

&#x20;  ```



&#x20;  \*\*Example (multi-layer system):\*\*

&#x20;  ```bash

&#x20;  # Layer 1: Workflow

&#x20;  echo "=== Secrets available in workflow: ==="

&#x20;  echo "IDENTITY: ${IDENTITY:+SET}${IDENTITY:-UNSET}"



&#x20;  # Layer 2: Build script

&#x20;  echo "=== Env vars in build script: ==="

&#x20;  env | grep IDENTITY || echo "IDENTITY not in environment"



&#x20;  # Layer 3: Signing script

&#x20;  echo "=== Keychain state: ==="

&#x20;  security list-keychains

&#x20;  security find-identity -v



&#x20;  # Layer 4: Actual signing

&#x20;  codesign --sign "$IDENTITY" --verbose=4 "$APP"

&#x20;  ```



&#x20;  \*\*This reveals:\*\* Which layer fails (secrets → workflow ✓, workflow → build ✗)



5\. \*\*Trace Data Flow\*\*



&#x20;  \*\*WHEN error is deep in call stack:\*\*



&#x20;  See `root-cause-tracing.md` in this directory for the complete backward tracing technique.



&#x20;  \*\*Quick version:\*\*

&#x20;  - Where does bad value originate?

&#x20;  - What called this with bad value?

&#x20;  - Keep tracing up until you find the source

&#x20;  - Fix at source, not at symptom



\### Phase 2: Pattern Analysis



\*\*Find the pattern before fixing:\*\*



1\. \*\*Find Working Examples\*\*

&#x20;  - Locate similar working code in same codebase

&#x20;  - What works that's similar to what's broken?



2\. \*\*Compare Against References\*\*

&#x20;  - If implementing pattern, read reference implementation COMPLETELY

&#x20;  - Don't skim - read every line

&#x20;  - Understand the pattern fully before applying



3\. \*\*Identify Differences\*\*

&#x20;  - What's different between working and broken?

&#x20;  - List every difference, however small

&#x20;  - Don't assume "that can't matter"



4\. \*\*Understand Dependencies\*\*

&#x20;  - What other components does this need?

&#x20;  - What settings, config, environment?

&#x20;  - What assumptions does it make?



\### Phase 3: Hypothesis and Testing



\*\*Scientific method:\*\*



1\. \*\*Form Single Hypothesis\*\*

&#x20;  - State clearly: "I think X is the root cause because Y"

&#x20;  - Write it down

&#x20;  - Be specific, not vague



2\. \*\*Test Minimally\*\*

&#x20;  - Make the SMALLEST possible change to test hypothesis

&#x20;  - One variable at a time

&#x20;  - Don't fix multiple things at once



3\. \*\*Verify Before Continuing\*\*

&#x20;  - Did it work? Yes → Phase 4

&#x20;  - Didn't work? Form NEW hypothesis

&#x20;  - DON'T add more fixes on top



4\. \*\*When You Don't Know\*\*

&#x20;  - Say "I don't understand X"

&#x20;  - Don't pretend to know

&#x20;  - Ask for help

&#x20;  - Research more



\### Phase 4: Implementation



\*\*Fix the root cause, not the symptom:\*\*



1\. \*\*Create Failing Test Case\*\*

&#x20;  - Simplest possible reproduction

&#x20;  - Automated test if possible

&#x20;  - One-off test script if no framework

&#x20;  - MUST have before fixing

&#x20;  - Use the `superpowers:test-driven-development` skill for writing proper failing tests



2\. \*\*Implement Single Fix\*\*

&#x20;  - Address the root cause identified

&#x20;  - ONE change at a time

&#x20;  - No "while I'm here" improvements

&#x20;  - No bundled refactoring



3\. \*\*Verify Fix\*\*

&#x20;  - Test passes now?

&#x20;  - No other tests broken?

&#x20;  - Issue actually resolved?



4\. \*\*If Fix Doesn't Work\*\*

&#x20;  - STOP

&#x20;  - Count: How many fixes have you tried?

&#x20;  - If < 3: Return to Phase 1, re-analyze with new information

&#x20;  - \*\*If ≥ 3: STOP and question the architecture (step 5 below)\*\*

&#x20;  - DON'T attempt Fix #4 without architectural discussion



5\. \*\*If 3+ Fixes Failed: Question Architecture\*\*



&#x20;  \*\*Pattern indicating architectural problem:\*\*

&#x20;  - Each fix reveals new shared state/coupling/problem in different place

&#x20;  - Fixes require "massive refactoring" to implement

&#x20;  - Each fix creates new symptoms elsewhere



&#x20;  \*\*STOP and question fundamentals:\*\*

&#x20;  - Is this pattern fundamentally sound?

&#x20;  - Are we "sticking with it through sheer inertia"?

&#x20;  - Should we refactor architecture vs. continue fixing symptoms?



&#x20;  \*\*Discuss with your human partner before attempting more fixes\*\*



&#x20;  This is NOT a failed hypothesis - this is a wrong architecture.



\## Red Flags - STOP and Follow Process



If you catch yourself thinking:

\- "Quick fix for now, investigate later"

\- "Just try changing X and see if it works"

\- "Add multiple changes, run tests"

\- "Skip the test, I'll manually verify"

\- "It's probably X, let me fix that"

\- "I don't fully understand but this might work"

\- "Pattern says X but I'll adapt it differently"

\- "Here are the main problems: \[lists fixes without investigation]"

\- Proposing solutions before tracing data flow

\- \*\*"One more fix attempt" (when already tried 2+)\*\*

\- \*\*Each fix reveals new problem in different place\*\*



\*\*ALL of these mean: STOP. Return to Phase 1.\*\*



\*\*If 3+ fixes failed:\*\* Question the architecture (see Phase 4.5)



\## your human partner's Signals You're Doing It Wrong



\*\*Watch for these redirections:\*\*

\- "Is that not happening?" - You assumed without verifying

\- "Will it show us...?" - You should have added evidence gathering

\- "Stop guessing" - You're proposing fixes without understanding

\- "Ultra-think this" - Question fundamentals, not just symptoms

\- "We're stuck?" (frustrated) - Your approach isn't working



\*\*When you see these:\*\* STOP. Return to Phase 1.



\## Common Rationalizations



| Excuse | Reality |

|--------|---------|

| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |

| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |

| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |

| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |

| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |

| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |

| "I see the problem, let me fix it" | Seeing symptoms ≠ understanding root cause. |

| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question pattern, don't fix again. |



\## Quick Reference



| Phase | Key Activities | Success Criteria |

|-------|---------------|------------------|

| \*\*1. Root Cause\*\* | Read errors, reproduce, check changes, gather evidence | Understand WHAT and WHY |

| \*\*2. Pattern\*\* | Find working examples, compare | Identify differences |

| \*\*3. Hypothesis\*\* | Form theory, test minimally | Confirmed or new hypothesis |

| \*\*4. Implementation\*\* | Create test, fix, verify | Bug resolved, tests pass |



\## When Process Reveals "No Root Cause"



If systematic investigation reveals issue is truly environmental, timing-dependent, or external:



1\. You've completed the process

2\. Document what you investigated

3\. Implement appropriate handling (retry, timeout, error message)

4\. Add monitoring/logging for future investigation



\*\*But:\*\* 95% of "no root cause" cases are incomplete investigation.



\## Supporting Techniques



These techniques are part of systematic debugging and available in this directory:



\- \*\*`root-cause-tracing.md`\*\* - Trace bugs backward through call stack to find original trigger

\- \*\*`defense-in-depth.md`\*\* - Add validation at multiple layers after finding root cause

\- \*\*`condition-based-waiting.md`\*\* - Replace arbitrary timeouts with condition polling



\*\*Related skills:\*\*

\- \*\*superpowers:test-driven-development\*\* - For creating failing test case (Phase 4, Step 1)

\- \*\*superpowers:verification-before-completion\*\* - Verify fix worked before claiming success



\## Real-World Impact



From debugging sessions:

\- Systematic approach: 15-30 minutes to fix

\- Random fixes approach: 2-3 hours of thrashing

\- First-time fix rate: 95% vs 40%

\- New bugs introduced: Near zero vs common



----------------------------------


---
name: pen-design
description: >
  Create high-quality visual designs â€” websites, app screens, dashboards, slides, marketing materials, social media graphics â€” using the pen.dev CLI tool. Use this skill whenever the user wants to create, generate, or visualize any kind of UI design, mockup, wireframe, layout, webpage, app screen, presentation slide, poster, banner, or marketing asset. Also use it when the user says things like "design me a...", "make a visual for...", "create a mockup of...", "what would X look like?", or wants to turn an idea into a visual. Even if the user doesn't mention "pen.dev" or "design tool" explicitly â€” if they want something visual created, this is the skill to use.
---

# pen.dev Design

Create professional visual designs from natural language descriptions using the pen.dev CLI. pen.dev is a headless design tool that generates `.pen` files (a structured JSON design format) and can export them as images.

## Setup

Before designing, make sure the pen.dev CLI is available.

### Check installation

```bash
which pen || npx pen version
```

If `pen` is not found, install it:

```bash
npm install -g @pen.dev/cli
```

If global install fails due to permissions, install locally instead:

```bash
npm install @pen.dev/cli
```

Then run it via `npx pen` (or `./node_modules/.bin/pen`) instead of `pen`.
You can learn about the available commands via the `pen --help` command.

### Authentication

#### pen.dev user

To use the CLI, an authenticated user logged in to pen.dev is required. First, check
the current user configuration on the machine with the `pen status` command.

If not logged in, there are the following options:

- use `pen signup --email you@example.com --username johndoe --name "John Doe"` command, to create a new user.
- use `pen login --email you@example.com [--code abc123]` to authenticate an existing or newly created user.
- optionally, the `PEN_CLI_KEY` env var can also be used for authentication if its set in your session.

#### Claude Code agent

The CLI needs auth to run its AI agent for which Claude Code is required. For that
there needs to be an authenticated Claude Code user set in the system configuration
either via env var or a user subscription.

If none of these are available, tell the user what options they have and help them set one up.

### Staying up to date

This skill stays in sync with the **pen.dev CLI npm package** (`@pen.dev/cli`). The published package includes `SKILL.md` at its root; the package version is the skill version.

**Check for a newer CLI / skill**

- Latest version on the registry: `npm view @pen.dev/cli version`
- Installed CLI: `pen version`, or `npm list -g @pen.dev/cli` (global) / `npm list @pen.dev/cli` (project)

**Upgrade the CLI**, then refresh your copied skill file (agents do not auto-update skill files you placed in config folders):

```bash
npm install -g @pen.dev/cli
```

**Where to copy the skill from after installing**

- From a dependency tree: `node_modules/@pen.dev/cli/SKILL.md` (path is the same for global and local installs; resolve from your project root or global `node_modules` prefix).

**Fetch the same file without cloning the repo** (mirrors the npm tarball; optional third-party CDNs):

- `https://unpkg.com/@pen.dev/cli@latest/SKILL.md`
- `https://cdn.jsdelivr.net/npm/@pen.dev/cli@latest/SKILL.md`

Use `@latest` for the newest publish, or pin (e.g. `@0.2.4`) for a reproducible snapshot.

**If you donâ€™t know where skills live on this machine**

Agents donâ€™t always get the skills directory from context. When the path isnâ€™t obvious:

- **Ask the user** where their agent or IDE loads skills from, or where they want this skill installed.
- **Check the productâ€™s docs** for â€œskillsâ€, â€œagent skillsâ€, or â€œpluginsâ€ â€” paths differ by tool and version.
- You can still **use the skill content without installing**: fetch or open the **`SKILL.md` URL above** (unpkg/jsDelivr) in the session so guidance applies even when the on-disk path is unknown. For a persistent install, copy the fetched file into the path the user or docs specify.

**Typical skill locations** (confirm with your toolâ€™s current docs â€” layouts change):

| Environment | Where to put `SKILL.md` |
|-------------|-------------------------|
| **Cursor** | Project: `.cursor/skills/pen-design/SKILL.md`; user-level: under `~/.cursor/skills/` |
| **Claude Code** | Often `.claude/skills/pen-design/SKILL.md` or user-level under `~/.claude/` |
| **OpenClaw** | Often `~/.openclaw/skills/`, workspace `.agents/skills/`, or paths in [OpenClaw skills docs](https://docs.openclaw.ai/skills/) â€” verify for the userâ€™s setup |
| **Other agents (Codex, etc.)** | Use the directory your product uses for skills or prompts |

Example (adjust the destination path to match your agent):

```bash
curl -fsSL "https://unpkg.com/@pen.dev/cli@latest/SKILL.md" -o .cursor/skills/pen-design/SKILL.md
```

**When to check for an update**

- **Early in the session**, before the first pen.dev design run (compare `npm view @pen.dev/cli version` to the installed CLI), so you arenâ€™t following stale instructions.
- **Again** if the user says they upgraded the CLI, or if behavior doesnâ€™t match this doc (flags, auth, timing).
- **Not** before every single command â€” once per session is enough unless something changed or errors suggest a version mismatch.

## Creating a Design

The core command:

```bash
pen --out <output.pen> --prompt "<design description>" --export <output.png> --export-scale 2
```

Key flags:
- `--out, -o` â€” where to save the `.pen` file (required)
- `--prompt, -p` â€” what to design (required)
- `--prompt-file, -f` â€” attach an image or text file to send with the prompt (repeatable). Same idea as attaching reference images in the pen.dev editor chat; not for loading the prompt text from a file.
- `--export, -e` â€” export an image of the result
- `--export-scale` â€” image resolution multiplier (use 2 for crisp output)
- `--export-type` â€” format: `png` (default), `jpeg`, `webp`, `pdf`
- `--in, -i` â€” start from an existing `.pen` file (for iteration)
- `--model, -m` â€” Claude model to use (defaults to Opus)

### Passing the Prompt

Pass the user's request directly as the prompt â€” do not expand, or add detail beyond what the user actually said. The pen.dev CLI has its own AI designer agent that handles creative decisions like layout structure, color palettes, typography, spacing, and content. Adding your own design specifics on top of the user's request will conflict with the CLI agent's own judgment and produce worse results.

If the user says "make me a landing page for a coffee shop", the prompt should be exactly that â€” not a paragraph with hero sections, color palettes, and font choices you invented.

### Timing Expectations

Design generation is not instant â€” the CLI runs an AI agent that plans the layout, creates each element, and validates the result visually. Expect:

- **Simple designs** (a card, a single component): 1-2 minutes
- **Medium designs** (an app screen, a landing page section): 2-3 minutes
- **Complex designs** (full landing page, detailed dashboard): 3-5+ minutes

Let the user know upfront that generation will take a few minutes so they're not left wondering. Use a generous timeout (at least 600000ms / 10 minutes) when running the command.

### Showing the Result

After the command completes, read the exported image to show it to the user:

```bash
# The command exports to the path you specified
pen --out design.pen --prompt "..." --export design.png --export-scale 2
```

Then use the Read tool on the exported PNG â€” it will render visually since you're a multimodal model.

Always show the image to the user after creating it. This is the whole point â€” they want to see the visual.

## Iterating on a Design

When the user wants changes to an existing design, use the `--in` flag to load the previous `.pen` file:

```bash
pen --in design.pen --out design-v2.pen --prompt "Make the header larger and change the accent color to green" --export design-v2.png --export-scale 2
```

The agent will read the existing design and apply modifications rather than starting from scratch.

For quick successive iterations, keep a consistent naming pattern:
- `design.pen` â†’ `design-v2.pen` â†’ `design-v3.pen`
- Or use a single file: `--in design.pen --out design.pen` (overwrites)

## Working Directory

Save design files in the user's current working directory or a subdirectory like `designs/`. Don't use temp directories â€” the user will want to find and iterate on these files later.

