# Exam Quality Analysis NEXT

[中文说明](README.md) · [Live prototype](https://yusheng266186-beep.github.io/zhiliang-huixi-next/) · [Production app](https://github.com/yusheng266186-beep/zhiliang-huixi-new-)

NEXT is a redesign proposal for the Exam Quality Analysis application. The evaluation focuses on navigation, reading hierarchy, chart interaction, report composition, and motion while preserving the analysis contract of the production project.

## How to evaluate it

1. Start in Rules and Class Types and use demo or authorized de-identified workbook data.
2. Compare a matching exam, cohort, and filter in the production interface and the prototype. Inspect the overview, classroom comparisons, student history, and item charts.
3. Check keyboard focus, narrow-screen navigation, reduced motion, and the full export of a selected report.
4. Read [DESIGN.md](DESIGN.md) before changing design tokens, motion primitives, or reusable components. Changes to statistical interpretation belong in a separately reviewed analysis change.

The app parses the workbook locally and uses IndexedDB for its workspace. Use local fictional fixtures when evaluating the redesign publicly.

## Local preview and handoff

Use Node.js 22.13 or later. Run:

~~~bash
npm ci
npm run dev
~~~

Run <code>npm run lint</code>, <code>npx tsc --noEmit</code>, and <code>npm run test</code> to check the prototype. Run <code>npm run test:parser</code> and <code>npm run test:analytics</code> with a local fixture to compare the analysis core. The Chinese handoff section describes the integration path into the production repository.
