// @types/react-dom@18.3.7 declares useFormState/useFormStatus in canary.d.ts, not the stable
// index.d.ts a plain `import {...} from "react-dom"` resolves against, even though both hooks
// are genuinely present in the react-dom@18.3.1 runtime this app actually ships (Next.js's own
// Server Actions guide uses exactly this pair). This file's sole purpose is to load that
// augmentation project-wide, via the triple-slash form canary.d.ts's own header comment
// documents -- deliberately NOT via tsconfig's "types" array: that global-types-root mechanism
// pulled in a stray reference to apps/mobile's @types/react@19 (a different workspace member's
// dependency) into every component's inferred return type, which this narrower, single-file
// reference does not.
/// <reference types="react-dom/canary" />
