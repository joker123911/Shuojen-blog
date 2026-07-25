# Antigravity Workspace Rules & Skill Auto-Advisor

Whenever the user submits a request, instruction, or prompt in Antigravity, you MUST perform a Skill Recommendation Check before executing or answering.

## Available Skills Reference

| Skill | Trigger Intent / Scenario | Primary Goal & How to Invoke |
| :--- | :--- | :--- |
| **`grill-me`** | Planning a new feature, clarifying unclear requirements, stress-testing design decisions, interviewing before coding. | Relentlessly interviews the user one question at a time to clarify decision trees and align on intent. |
| **`writing-great-skills`** | Creating new skills, editing/refactoring existing skills, learning skill design principles. | Guides skill authors on information hierarchy, leading words, context load, and predictability. |
| **`to-spec`** | Synthesizing previous discussion/chat into a formal specification or PRD without an interactive interview. | Converts current context into a detailed spec with problem statement, user stories, and testing decisions. |
| **`implement`** | Executing code changes based on an existing spec, PRD, or set of tickets. | Guides the implementation phase using TDD seams, regular typechecking, and closing code reviews. |
| **`tdd`** | Writing test-first code, implementing features/bugfixes via Red-Green-Refactor loop. | Enforces test-driven development at pre-agreed seams using vertical slices and independent assertions. |
| **`code-review`** | Reviewing changes (PR, branch, git diff) against repo coding standards and spec requirements. | Runs parallel sub-agent reviews on Standards (Fowler code smells) and Spec (PRD alignment). |

## Required Response Protocol

At the VERY BEGINNING of your response to any user request (before running non-research executing commands or providing full implementations), include a **Skill Recommendation Banner**:

> 💡 **[Skill Recommendation / 技能建議]**
> - **Recommended Skill**: `/skill-name` (or "目前階段無須特定 Skill / 一般指令")
> - **Reason**: Brief explanation of why this skill fits the current prompt.
> - **Action**: State how to proceed or suggest the user invoke `/skill-name`.
