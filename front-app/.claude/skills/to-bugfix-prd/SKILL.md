---
name: to-bugfix-prd
description: Turn the current bug context into a Technical Bug Fix PRD and submit it as a GitHub issue. Use when a user needs to document the formal resolution and technical requirements for a complex bug.
---

This skill takes the current conversation context and codebase understanding to produce a Technical Bug Fix PRD. Do NOT interview the user — just synthesize the technical data already available.

## Process

1. **Root Cause Analysis (RCA):** Explore the repo to pinpoint the exact origin of the bug. Look for logic inconsistencies, race conditions, or resource leaks.

2. **Module Impact Assessment:** Identify which modules are failing. Look for opportunities to refactor "deep modules" to ensure the fix is robust and doesn't introduce regressions.

3. **Technical Story Mapping:** Translate the required fixes into Technical Stories that describe the restoration of system stability and expected behavior.

4. **Issue Submission:** Write the PRD using the template below and submit it as a GitHub issue.

<prd-template>

## Incident Summary
A clear description of the current erroneous behavior from both the user's and the system's perspective.

## Technical Root Cause
A deep dive into **why** the error is happening (e.g., memory leak, unhandled Promise rejection, incorrect state transition in Module X).

## Technical Stories
A LONG, numbered list of technical stories. Each story should focus on system restoration or internal requirements using the format:

1. As a <technical role/system component>, I want to <technical action/fix>, so that <expected technical outcome/stability>.

<technical-story-example>
1. As the Database Wrapper, I want to implement an explicit connection timeout, so that the connection pool is not exhausted during high-traffic spikes.
</technical-story-example>

This list should cover all technical adjustments, including logging, error handling, and performance restoration.

## Implementation Decisions
A list of technical decisions made to resolve the issue:
- Modules to be refactored or patched.
- Changes to API contracts or internal interfaces to fix the data flow.
- Structural architectural decisions made to prevent this bug from reoccurring.
- Schema migrations or configuration changes required.

Do NOT include specific file paths or code snippets.

## Testing & Regression Plan
A strategy to ensure the bug is dead and stays dead:
- **Reproduction Test:** How to verify the fix addresses the reported symptom.
- **Regression Testing:** Which modules will have new tests written for their external behavior.
- **Edge Cases:** Boundary conditions that could trigger similar failures.

## Out of Scope
Technical debt or related issues identified during the analysis that will NOT be addressed in this specific fix.

## Further Notes
Any additional technical context, links to logs, or monitoring dashboards related to the bug.

</prd-template>