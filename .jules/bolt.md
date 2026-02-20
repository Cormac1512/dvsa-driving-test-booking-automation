## 2025-02-12 - Infinite Loop Risk in Logic
**Learning:** The script blindly calls `step4` (postcode entry) when the page title is 'Test centre'. If the results page also has this title, it creates an infinite loop of re-entering postcode instead of checking results (`step5`). This is a critical functional/performance flaw.
**Action:** In future, verify state transitions more carefully in `handlePage` logic, checking for specific elements (like results container) rather than just `document.title` to differentiate steps.
