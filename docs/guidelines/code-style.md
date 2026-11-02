# Code style (all packages)

Applies to `be/`, `fe/`, `mobile/` and `landing/`. The goal: **simple code a reader understands on the first pass**, written in a pragmatic functional style.

## 1. Names explain the code

- A variable says **what it holds**, a function says **what it does** (verb + object): `pendingWrite`, `serverHasSet`, `queueDeleteForSet()`.
- No abbreviations: `operation` not `op`, `revision` not `rev`, `temporaryFile` not `tmp`, `total` not `acc`.
- Booleans read as a yes/no question: `isDone`, `hasSets`, `serverHasSet`.
- If a condition needs a moment of thought, give it a name before the `if`.

```ts
// No
if (log.sets[key]?.onServer ?? log.pending[key]?.kind === "delete") { … }

// Yes
const deleteIsQueued = log.pending[key]?.kind === "delete";
const serverHasSet = log.sets[key]?.onServer ?? deleteIsQueued;
if (serverHasSet) { … }
```

## 2. One idea per line

- Name intermediate results instead of nesting calls or object spreads.
- No nested ternaries. No ternary inside an object literal or a JSX prop when it does not fit on one short line: use an `if` or a named `const`.
- Early `return` instead of deep `if` / `else` nesting.

## 3. Pragmatic functional

- Logic lives in **pure functions**: same input → same output, no I/O, never mutate an argument. Return a new value.
- Side effects (disk, network, React state, timers) stay at the edges, in thin functions that call the pure ones.
- `map` / `filter` / `find` for each clear step. A plain `for…of` over a `reduce` that needs thinking. `reduce` only for sums and counts.

## 4. No clever syntax

Readable beats short. Avoid:

| Instead of | Write |
| --- | --- |
| `const { [key]: _drop, ...rest } = record` | a named helper: `withoutKey(record, key)` |
| `items[0]!` (non-null assertion) | a check with a clear error, or a type that cannot be empty |
| `cond && doSomething()` as a statement | `if (cond) { doSomething(); }` |
| long `a?.b ?? c?.d === e` chains | named `const`s (rule 1) |
| `.reduce(fn, start)` to replay steps | a `for` loop with a named variable |

## 5. Small functions, comments say why

- One function, one job. Many branches or a long body → split into named steps.
- A comment explains **why** (a rule, a race, a platform limit), not what the next line does. If you need a comment to explain *what*, rename or split instead.

## 6. `const` by default, build values instead of filling them

- `const` by default. `let` only for state that really changes over time at the edges (a store, a timer), kept in one place.
- No `while` / `do…while`: use array methods, `for…of` on a fixed list, or recursion.
- An array or object comes from a transformation, not from an empty one filled in a loop.

| Instead of | Write |
| --- | --- |
| `const out = []; for (…) out.push(…)` | `items.map(…)` / `filter(…)` |
| `const out = {}; for (…) out[key] = …` | `Object.fromEntries(items.map(…))` |
| a loop that fills a list and can stop on an error | `map` to results → `find` the first error → `map` the values |
| a `Set` of seen keys to find duplicates | `some` + `findIndex` with a named comparison |
| `let x = a; x = step(x); x = other(x)` in a test | one named `const` per step: `afterLog`, `afterUndo` |

```ts
// No
const sets: CloseSetInput[] = [];
for (const entry of value) {
  const parsed = validateCloseSet(entry);
  if (!parsed.ok) return parsed;
  sets.push(parsed.value);
}

// Yes
const results = value.map((entry) => validateCloseSet(entry));
const firstInvalid = results.find((result): result is Invalid => !result.ok);
if (firstInvalid) return firstInvalid;
const sets = results
  .filter((result): result is Valid<CloseSetInput> => result.ok)
  .map((result) => result.value);
```
