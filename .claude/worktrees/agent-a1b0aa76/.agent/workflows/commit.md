---
description: stage, commit, and push changes to git with a generated message
---

When the user asks to commit changes (e.g., via `/commit`), follow these steps:

1. **Review Changes:**
   - Run `git status` to see the current state of the working directory.
   - Run `git diff HEAD` (or a combination of `git diff` and `git diff --cached`) to understand what has been modified.

2. **Check README:**
   - Based on the modified files and new features, check if `README.md` (or other core documentation) needs to be updated.
   - If updates are required, modify the README and review its changes before proceeding.

3. **Stage Files:**
   - Stage specific files by name using `git add <file1> <file2> ...`.
   - Do **not** use `git add -A` or `git add .` — always stage explicitly to avoid committing secrets, large binaries, or unintended files.
   - If the user requested a partial commit, only stage the files they specified.

4. **Generate Message:**
   - Based on the diff, write a concise and informative commit message summarizing the changes.

5. **Execute Commit:**
   - Run the commit command with your generated message:
   ```bash
   git commit -m "<your_informative_message>"
   ```
   - **Do not auto-push.** After committing, ask the user if they want to push to the remote.
