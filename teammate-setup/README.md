# Running the Scholarship Scout hourly refresh from a second account

This lets a teammate with their own paid Claude account run the same hourly refresh, so the work carries on when the owner's usage limit is reached. Both copies can stay on at the same time: every run takes a lock in the database first, and a run that finds the lock taken stops without writing anything.

## What the owner does (once)

1. **Share the Scholarship Scout page with edit access.** Open https://claude.ai/artifact/TazuHWmFYYwJHwpSfHmA82, press Share, add the teammate's Claude account, and give it edit access. The refresh writes to the page's database, so view-only access is not enough.
2. **Give the teammate push access to this repo.** On GitHub: mbuwul/scholarship-feed > Settings > Collaborators > Add people, with Write access.
3. **Merge this folder into `main`**, so the scripts are on the branch the scheduled task clones.

## What the teammate does (once)

1. Accept the GitHub invitation, then connect GitHub to Claude at https://claude.ai/connect-github and install the Claude GitHub app on mbuwul/scholarship-feed if asked.
2. In Claude Code on the web (claude.ai/code), create an environment that includes the repo `mbuwul/scholarship-feed`.
3. Create a scheduled task in that environment:
   - Name: `Scholarship Scout hourly refresh`
   - Schedule: every hour at minute 40 (cron `40 * * * *`, UTC)
   - Each run starts a new session
   - Instructions: paste the whole of [scheduled-task-prompt.txt](scheduled-task-prompt.txt), unchanged.
4. Run it once by hand and check that the summary ends with a line like `Feed: pushed N opportunities, M admissions`.

## Notes

- The two export scripts here are copies of the ones the owner's task uses. If one copy changes, update the other.
- If the owner's instructions change (for example when sprint mode ends), this prompt file is updated too, and the teammate re-pastes it.
