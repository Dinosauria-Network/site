import { getSourceFavicon, formatTimeAgo } from "../lib/genus-data";

// Basic smoke test for utility exports
console.assert(typeof getSourceFavicon === "function", "getSourceFavicon should be a function");
console.assert(typeof formatTimeAgo === "function", "formatTimeAgo should be a function");
console.log("Smoke tests passed.");
