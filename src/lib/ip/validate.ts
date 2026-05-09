/**
 * Validation pure (booléens). Aucune exception, aucune dépendance.
 * Les fonctions de parse/format peuvent en hériter pour plus de robustesse.
 */

const DEC_OCTET_RE = /^(0|[1-9]\d{0,2})$/;

export function isValidDottedIPv4(input: string): boolean {
  if (typeof input !== "string") return false;
  const parts = input.trim().split(".");
  if (parts.length !== 4) return false;
  for (const p of parts) {
    if (!DEC_OCTET_RE.test(p)) return false;
    const n = Number(p);
    if (!Number.isInteger(n) || n < 0 || n > 255) return false;
  }
  return true;
}

/**
 * Accepte une IP binaire avec ou sans séparateurs (points/espaces) entre octets.
 * Doit faire exactement 32 bits une fois nettoyée.
 */
export function isValidBinaryIPv4(input: string): boolean {
  if (typeof input !== "string") return false;
  const cleaned = input.trim().replace(/[.\s]/g, "");
  return /^[01]{32}$/.test(cleaned);
}

export function isValidPrefix(prefix: number): boolean {
  return Number.isInteger(prefix) && prefix >= 0 && prefix <= 32;
}

/** Vérifie qu'un masque entier 32 bits est contigu (que des 1 puis que des 0). */
export function isContiguousMask(mask: number): boolean {
  if (!Number.isInteger(mask)) return false;
  const m = mask >>> 0;
  // ~m + 1 = -m (en non signé : 2^32 - m). Un masque contigu vérifie m & -m == 2^k
  // Plus simple : vérifier qu'on a la forme 1*0*.
  // Les valeurs valides sont : 0, et toute valeur de la forme 0xFFFFFFFF << (32 - p) >>> 0.
  if (m === 0) return true;
  // Compter les bits de poids fort à 1 jusqu'au premier 0, puis vérifier le reste.
  let p = 0;
  let bit = 0x80000000 >>> 0;
  while (p < 32 && (m & bit) !== 0) {
    p++;
    bit = bit >>> 1;
  }
  // Tous les bits restants doivent être à 0.
  const expected = (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0) >>> 0;
  return m === expected;
}

/** Accepte "/24", "24", ou "255.255.255.0". */
export function isValidMask(input: string): boolean {
  if (typeof input !== "string") return false;
  const s = input.trim();
  if (s.startsWith("/")) {
    const n = Number(s.slice(1));
    return isValidPrefix(n);
  }
  if (/^\d+$/.test(s)) {
    return isValidPrefix(Number(s));
  }
  if (isValidDottedIPv4(s)) {
    const parts = s.split(".").map(Number);
    const [a, b, c, d] = parts;
    if (a === undefined || b === undefined || c === undefined || d === undefined) {
      return false;
    }
    const m = (((a << 24) | (b << 16) | (c << 8) | d) >>> 0);
    return isContiguousMask(m);
  }
  return false;
}

/** "192.168.1.0/24" */
export function isValidCIDR(input: string): boolean {
  if (typeof input !== "string") return false;
  const parts = input.trim().split("/");
  if (parts.length !== 2) return false;
  const [ip, p] = parts;
  if (ip === undefined || p === undefined) return false;
  if (!isValidDottedIPv4(ip)) return false;
  if (!/^\d+$/.test(p)) return false;
  return isValidPrefix(Number(p));
}
