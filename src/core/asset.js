// Cesta k souboru aplikace. Verze v jednom souboru (na flashku, tools/build_offline.mjs) má soubory vložené ve window.S200_ASSETS jako data URI.
export const AS = (p) => (typeof window !== 'undefined' && window.S200_ASSETS && window.S200_ASSETS[p]) || p;
