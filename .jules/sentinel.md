## 2025-02-20 - Bot Stealth & Data Validation
**Vulnerability:** Submitting default placeholder data (e.g. "Your_Driver_Licence_Here") to the target site.
**Learning:** Automation scripts that fail to validate configuration before execution can submit easily identifiable junk data, increasing the risk of bot detection and IP bans.
**Prevention:** Implement strict validation checks at the start of the automation loop (or key action steps) to abort execution if configuration is invalid or default.
## 2025-02-21 - Bot Stealth & Default Data Exfiltration
**Vulnerability:** Submitting default placeholder data ("15/08/2024", "PS2 4PZ") to the target site due to missing validation checks in the `enterTestDate` and `enterPostcode` functions.
**Learning:** Even if data matches a valid format (e.g. a valid date regex or postcode regex), it must also be validated against default/placeholder values to prevent the script from executing with generic junk data. Submitting identical placeholder data across many sessions increases the likelihood of bot detection and IP bans.
**Prevention:** Implement strict equality checks against default placeholder constants (e.g. `DEFAULT_DATE`, `DEFAULT_POSTCODE`) in addition to format validation regexes before submitting form data.
## 2025-03-05 - Bot Stealth & Async Exception Handling
**Vulnerability:** Unhandled exceptions in asynchronous callbacks (like `setTimeout` or `setInterval`) bypassing caller `try-catch` blocks and leaking stack traces to the host page's console.
**Learning:** Such leaks can expose the presence of the automation script to anti-bot detection systems.
**Prevention:** Always wrap the execution of async callbacks in explicit `try-catch` blocks to ensure they fail securely and do not leak internal script details to the environment.
