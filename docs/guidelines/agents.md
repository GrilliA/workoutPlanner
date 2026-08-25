# Agent process

Working rules, not code style.

## New things that are not obvious

If you introduce a type, helper, name, or folder that **does not already exist** in the code you are touching:

1. Do not invent it and ship.
2. Propose **2–3 options** (the name, where it lives, or whether to extract it at all).
3. Wait for a choice.

Example: a mapper used twice should not be called `toX` if the name does not say what it copies. Ask: inline / `catalogSnapshotFrom` / something else.

## Finish check

Before calling the work done, verify:

| Check | Look for |
| --- | --- |
| Names | The identifier says what it does without knowing the file |
| Call sites | Helper with 1–2 call sites and a vague name → inline or rename, not “utility for later” |
| Snapshot | Fields that always travel together (e.g. catalog) are one object, not N `useState` / props |
| Exports | No unused public symbols |
| Scope | You did not “also fix the rest” beyond what was asked |

If a check fails, fix it or ask — do not leave the name “good enough”.
