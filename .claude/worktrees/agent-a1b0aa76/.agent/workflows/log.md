# /log

Automatically extract session learnings from the chat history and log them to `.sessions/session_logs.jsonl`.

When this command is run:
1. Review the entire chat history for the current session.
2. Identify and extract the following items:
   - A brief `category` characterizing the entire session discussion (e.g., "Foundation Setup", "UI Design", "Database Modeling").
   - What went well (successes).
   - What did not work (failures/challenges).
   - Best practices discovered or established.
   - Any repetitive patterns or recurring tasks.
   - Instances where the user said "no", "don't do anything", or any variation of it (these reflect important user boundaries/constraints).
3. Format these learnings into a single-line JSON string containing the keys: `timestamp` (ISO format), `category` (string), `went_well`, `did_not_work`, `best_practices`, `repetitive_patterns`, and `user_boundaries`. All values except `timestamp` and `category` should be arrays of strings.
4. Use `run_command` with `echo '<json_string>' >> .sessions/session_logs.jsonl` to append the log.
5. Run `python .sessions/scripts/archive_sessions.py` to archive any logs older than 30 days.
