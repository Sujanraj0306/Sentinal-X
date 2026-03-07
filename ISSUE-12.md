# Issue #12: Master Judge LLM Crashing with 400 INVALID_ARGUMENT (Tool Conflict)

## Description
When the user dictates or types a strategy request to the "Master Judge" inside the Legal War Room, the AI crashes with a `400 INVALID_ARGUMENT` error.
The specific error payload from Google/Gemini is:
> "Built-in tools ({google_search}) and Custom tools (Function Calling) cannot be combined in the same request. Please choose one to continue."

## Root Cause
In `electron/main.cjs`, the `judgeTools` array combined a native Google Search built-in tool config with a custom JSON Function Calling schema (`call_petition_draftsman`). The Gemini API strictly forbids mixing built-in tools (like web search or code execution) with User-defined Function Calling inside the same request context.

## Resolution Steps
1. Created sub-branch: `fix/issue-12-gemini-tool-conflict` off the main feature stream (`module-3-dev`).
2. Edited `masterPrompt` inside `main.cjs` to remove the hardcoded instruction instructing the LLM to search the web for case laws.
3. Removed `{ googleSearch: {} }` from the `judgeTools` configuration array.
4. Committed and pushed the patch.

## Pull Request Information
This issue branch is currently sitting on the remote repository. 
You can instantly generate the PR for `module-3-dev` by clicking the link provided by the AI!
