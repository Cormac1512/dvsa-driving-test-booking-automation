## 2025-02-20 - Bot Stealth & Data Validation
**Vulnerability:** Submitting default placeholder data (e.g. "Your_Driver_Licence_Here") to the target site.
**Learning:** Automation scripts that fail to validate configuration before execution can submit easily identifiable junk data, increasing the risk of bot detection and IP bans.
**Prevention:** Implement strict validation checks at the start of the automation loop (or key action steps) to abort execution if configuration is invalid or default.
