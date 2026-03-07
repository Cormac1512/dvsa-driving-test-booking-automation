## 2025-02-12 - Infinite Loop Risk in Logic
**Learning:** The script blindly calls `step4` (postcode entry) when the page title is 'Test centre'. If the results page also has this title, it creates an infinite loop of re-entering postcode instead of checking results (`step5`). This is a critical functional/performance flaw.
**Action:** In future, verify state transitions more carefully in `handlePage` logic, checking for specific elements (like results container) rather than just `document.title` to differentiate steps.

## 2025-02-12 - Redundant DOM Queries in State Machine
**Learning:** The `handlePage` function identifies the current step by querying a specific element, but then the action function (e.g., `selectTestType`) re-queries the same element. This double-query pattern is inefficient, especially in a userscript that runs on every page load.
**Action:** When identifying a step via an element presence check, pass that element directly to the action function to avoid redundant DOM traversals.

## 2025-02-12 - Reusing DOM Elements for Frequent Updates
**Learning:** The `showToast` function was creating a new DOM element for every message, leading to overlapping text and unnecessary DOM churn when messages were triggered in quick succession (e.g., inside a loop or rapid state changes).
**Action:** Implemented a singleton pattern for the toast element (`app.toastElement`). Always check if an element exists and reuse it before creating a new one. This also required managing timeouts (`app.toastTimeout`) to prevent premature removal of the reused element.

## 2025-02-13 - Avoid Redundant textContent Updates
**Learning:** Frequent redundant updates to `element.textContent` trigger unnecessary layout recalculations and DOM reflows. In a script that heavily uses toast notifications for countdowns (updating text every second), this churn can cause significant performance overhead and lag in the UI.
**Action:** Implemented a simple check (`if (element.textContent !== newText)`) before assigning to `textContent`. Always apply this pattern when updating text or styles in frequent intervals like `requestAnimationFrame` or `setInterval`.

## 2025-02-13 - Replace contains() with parentNode checks
**Learning:** Checking DOM membership with `document.body.contains(toast)` is an O(N) tree traversal operation, which is highly inefficient in large DOMs when executed frequently (e.g., inside an interval or `requestAnimationFrame`).
**Action:** Use an O(1) property access check, such as `toast.parentNode === document.body` or `toast.parentNode !== null`, to verify if an element is currently in the DOM. This reduces performance overhead substantially during frequent UI updates.

## 2025-02-13 - AudioContext Resource Exhaustion
**Learning:** Instantiating `new AudioContext()` on every function call for an alert sound causes a memory leak and quickly leads to a `DOMException` crash. Browsers enforce a strict hardware limit (often ~6 concurrent contexts).
**Action:** Always cache hardware-backed browser APIs (like Web Audio API context) as singletons or application-level properties. When reusing a cached context, check `ctx.state === 'suspended'` and call `ctx.resume()` to handle browser autoplay policy restrictions gracefully.
