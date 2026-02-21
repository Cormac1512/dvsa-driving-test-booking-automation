## 2025-02-12 - Infinite Loop Risk in Logic
**Learning:** The script blindly calls `step4` (postcode entry) when the page title is 'Test centre'. If the results page also has this title, it creates an infinite loop of re-entering postcode instead of checking results (`step5`). This is a critical functional/performance flaw.
**Action:** In future, verify state transitions more carefully in `handlePage` logic, checking for specific elements (like results container) rather than just `document.title` to differentiate steps.

## 2025-02-12 - Redundant DOM Queries in State Machine
**Learning:** The `handlePage` function identifies the current step by querying a specific element, but then the action function (e.g., `selectTestType`) re-queries the same element. This double-query pattern is inefficient, especially in a userscript that runs on every page load.
**Action:** When identifying a step via an element presence check, pass that element directly to the action function to avoid redundant DOM traversals.
