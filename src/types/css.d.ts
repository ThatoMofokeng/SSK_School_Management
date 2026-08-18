// Ambient module declaration for plain (non-module) CSS side-effect imports,
// e.g. `import 'react-calendar/dist/Calendar.css';`.
//
// Next.js normally supplies this via its auto-generated `next-env.d.ts`
// (correctly gitignored, regenerated on `next dev`/`next build`). If that
// file is ever missing — a fresh clone, or a CI step that type-checks
// before Next has run once — TypeScript has no declaration for `*.css`
// and throws "Cannot find module or type declarations for side-effect
// import of ...". This file makes that independent of next-env.d.ts.
declare module "*.css";