## 2025-02-23 - Secure Random Number Generation
**Vulnerability:** Modulo bias in `window.crypto.getRandomValues` usage.
**Learning:** Simply using `% range` on a random integer introduces bias if the range does not evenly divide the random space (e.g. 2^32).
**Prevention:** Use rejection sampling: discard random values that fall into the biased remainder zone before applying modulo.
