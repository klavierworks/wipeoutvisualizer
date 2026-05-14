# CLAUDE.md

Project conventions for this repo. Apply without being asked.

## Code style

- Functional TypeScript. Prefer pure functions, immutable data, and composition over classes and mutation. Reach for `map`/`filter`/`reduce` over imperative loops when the result is a derived value (loops are still fine for per-frame side effects in render code).
- Pure functions are always preferred. A function that takes inputs, returns a derived value, and touches nothing else is the default. Reach for impurity (I/O, refs, mutation, randomness) only when the task genuinely requires it.
- Don't mutate arguments. Treat parameters as read-only — return a new value instead of modifying what was passed in. The exception is hot per-frame paths (three.js scratch vectors, audio buffers) where allocation cost matters; flag these explicitly with the convention of leading-underscore scratch names.
- One concern per function. A function should do one clearly-named thing. If you can't name it without "and", split it.
- Prefer many small named helpers over one long function with inline logic. Names are documentation.
- Always use braces for conditionals. No brace-less single-line `if`/`else`/`for`/`while` bodies, even for one-statement bodies.

## Component size

- Long components must be broken up. Two paths:
  1. Split into smaller child components with clear separation of concerns (each its own folder per the structure rules below).
  2. Extract logic-heavy helpers into a sibling `.ts` util file in the component's folder.
- Heuristic: if a component is hard to take in at a glance, or mixes unrelated concerns (data wrangling + rendering + side effects), it's too long.

## Components

- One component per file. If you find a file with two components, split it.
- Default export every component. `const Foo = ...` then `export default Foo` at the bottom.
- Each component lives in a folder named after it: `Foo/Foo.tsx`. Colocated CSS module is `Foo/Foo.module.css`.
- The folder tree matches the render hierarchy. A component rendered only by its parent goes in a subfolder of the parent. A component shared by multiple parents lives at the closest common ancestor.
- Components are not utils. A `.tsx` file should export a component and only a component. Helper functions used by one component go inside that file (or, if substantial, into a sibling `.ts` util file in the same folder — never a `.tsx`).
- Component names are PascalCase with at least one lowercase character (`Hud`, not `HUD`) — react-refresh classifies all-caps identifiers as constants.
- R3F components separate render logic from business logic. The `.tsx` should read as the scene graph: JSX, refs, and the thin `useFrame`/`useEffect` glue that wires inputs to outputs. Math, geometry construction, audio analysis, state derivation, and other non-trivial business logic belong in sibling `.ts` utils (or `src/constructor/`, `src/audio/`, etc. when shared) and get called from the component.

## Props

- Define a `ComponentNameProps` type above the component in the same file, even for inline-shaped props. No anonymous prop types (`({ x }: { x: number })`).
- Optional props use `?:` in the type, not legacy `defaultProps`.

## Types

- Use `type`, not `interface`. The only exception is declaration merging (e.g. augmenting `Window` in `global.d.ts`).
- Where possible, prefer to infer TS return types from function signatures, rather than explicitly defining.

## Constants

- Every module-level constant (primitives, fixed direction vectors, fixed quaternions) lives in `src/constants.ts`.
- Mutable scratch buffers (`_pos = new Vector3()` reused per frame) are NOT constants — keep them local to the file that uses them.
- One-off config objects passed once at construction (e.g. `GL_CONFIG` for `<Canvas>`) stay local.
- Group constants in `constants.ts` by domain with section-header comments (`// ─── Audio: runtime ───`). Section headers are the only comments allowed in this file.

## Naming

- No uncommon abbreviations in functions, variables, or props. `index` not `idx`, `current` not `cur`, `image` not `img`, `context` not `ctx`, `minutes`/`seconds` not `m`/`s`. Loop counters (`i`) and standard math/graphics conventions (`t` for spline parameter, leading-underscore scratch vars in three.js code) are fine.
- Boolean variable, prop, and field names should read as booleans. Prefer `is`/`has` prefixes (`isPlaying`, `hasLoaded`); fall back to `should`/`can`/`will` (`shouldRender`, `canSeek`) when those don't fit. Avoid bare nouns or verbs (`playing`, `loaded`, `ready`) that read as state or actions.
- Function and method names lead with a clear action verb: `calculate`, `get`, `set`, `create`, `remove`, `build`, `parse`, `update`. Avoid bare nouns (`position`, `data`) or vague verbs (`do`, `handle` outside of event handlers).
- Event handlers start with `handle` (`handleClick`, `handleSeek`, `handlePointerMove`). Props that pass them through use `on` (`onClick`, `onSeek`).

## Comments

- Default to no comments. Code should be understandable from well-chosen names and well-written structure — a profusion of comments is a code smell.
- Only add a comment when the code is genuinely unusual (a non-obvious workaround, a hidden invariant, a constraint a reader couldn't infer) or when a lint rule requires it (`// eslint-disable-...`).
- Allowed: `// eslint-disable-...` and similar directives, triple-slash directives, section headers in `constants.ts`.
- Never write JSDoc, TODO/FIXME notes, or "what this does" prose.

## Formatting

- Prettier owns layout (`npm run format`). Don't hand-format.
- ESLint enforces correctness only — `eslint-config-prettier` disables stylistic rules. Don't re-add `object-property-newline`, `padding-line-between-statements`, etc.

## Before declaring done

Both must pass with zero output:
- `npm run lint`
- `npx tsc -p . --noEmit`

If either fails, fix the cause — don't suppress.

## Unused code

- Delete unused `.ts`/`.tsx` files. Do not delete `.d.ts` files even if they look unused (they may declare ambient types).

## Three.js

- Use idiomatic three.js classes wherever the library already provides one (`Vector3`, `Quaternion`, `Matrix4`, `Box3`, `Spherical`, `Curve`/`CatmullRomCurve3`, `Raycaster`, `Color`, `Euler`, etc.). Don't roll your own math types or hand-written equivalents when a built-in covers the use case.
