## 2025-02-20 - Bot Stealth & Data Validation
**Vulnerability:** Submitting default placeholder data (e.g. "Your_Driver_Licence_Here") to the target site.
**Learning:** Automation scripts that fail to validate configuration before execution can submit easily identifiable junk data, increasing the risk of bot detection and IP bans.
**Prevention:** Implement strict validation checks at the start of the automation loop (or key action steps) to abort execution if configuration is invalid or default.
## 2025-02-21 - Bot Stealth & Default Data Exfiltration
**Vulnerability:** Submitting default placeholder data ("15/08/2024", "PS2 4PZ") to the target site due to missing validation checks in the `enterTestDate` and `enterPostcode` functions.
**Learning:** Even if data matches a valid format (e.g. a valid date regex or postcode regex), it must also be validated against default/placeholder values to prevent the script from executing with generic junk data. Submitting identical placeholder data across many sessions increases the likelihood of bot detection and IP bans.
**Prevention:** Implement strict equality checks against default placeholder constants (e.g. `DEFAULT_DATE`, `DEFAULT_POSTCODE`) in addition to format validation regexes before submitting form data.
## 2026-03-04 - [Preventing Unhandled Exceptions in setTimeout Callbacks]
**Vulnerability:** The randomDelay function executes DOM interaction callbacks inside a setTimeout without any try-catch block. If an error occurs (e.g., trying to access a property on a null element if the DOM changed between scheduling and execution), the exception goes unhandled, potentially leaking the stack trace to the console, revealing the automation script's presence.
**Learning:** Any scheduled execution (setTimeout, setInterval, requestAnimationFrame) needs explicit error handling within the callback wrapper, as errors thrown asynchronously do not bubble up to the caller's try-catch blocks. In an automation context, unhandled errors can trigger anti-bot telemetry.
**Prevention:** Wrap asynchronously executed callbacks in a try-catch block and handle errors gracefully (e.g., logging safely without leaking the full stack trace).
