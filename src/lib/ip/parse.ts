import {
  isValidBinaryIPv4,
  isValidDottedIPv4,
  isContiguousMask,
  isValidPrefix,
} from "./validate";
import type { IPv4, Prefix } from "./types";

export class IpParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IpParseError";
  }
}

/** "192.168.1.10" → 0xC0A8010A (entier non signé). */
export function parseDottedIPv4(input: string): IPv4 {
  if (!isValidDottedIPv4(input)) {
    throw new IpParseError(`IP décimale invalide : "${input}"`);
  }
  const [a, b, c, d] = input.trim().split(".").map(Number);
  return (((a! << 24) | (b! << 16) | (c! << 8) | d!) >>> 0);
}

/** "11000000.10101000.00000001.00001010" (avec ou sans séparateurs) → entier. */
export function parseBinaryIPv4(input: string): IPv4 {
  if (!isValidBinaryIPv4(input)) {
    throw new IpParseError(`IP binaire invalide : "${input}"`);
  }
  const cleaned = input.trim().replace(/[.\s]/g, "");
  return parseInt(cleaned, 2) >>> 0;
}

/** "/24" | "24" | "255.255.255.0" → préfixe 0..32. */
export function parseMask(input: string): Prefix {
  const s = input.trim();
  if (s.startsWith("/")) {
    const n = Number(s.slice(1));
    if (!isValidPrefix(n)) {
      throw new IpParseError(`Préfixe CIDR invalide : "${input}"`);
    }
    return n;
  }
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (!isValidPrefix(n)) {
      throw new IpParseError(`Préfixe CIDR invalide : "${input}"`);
    }
    return n;
  }
  // Forme décimale 255.255.255.0
  if (!isValidDottedIPv4(s)) {
    throw new IpParseError(`Masque invalide : "${input}"`);
  }
  const m = parseDottedIPv4(s);
  if (!isContiguousMask(m)) {
    throw new IpParseError(`Masque non contigu : "${input}"`);
  }
  return maskToPrefix(m);
}

/** "192.168.1.0/24" → { ip, prefix }. */
export function parseCIDR(input: string): { ip: IPv4; prefix: Prefix } {
  const parts = input.trim().split("/");
  if (parts.length !== 2) {
    throw new IpParseError(`Notation CIDR attendue (ex: 192.168.1.0/24) : "${input}"`);
  }
  const [ipPart, prefixPart] = parts;
  const ip = parseDottedIPv4(ipPart!);
  const prefix = parseMask("/" + prefixPart);
  return { ip, prefix };
}

/** Convertit un masque entier en longueur de préfixe (suppose contigu). */
export function maskToPrefix(mask: IPv4): Prefix {
  const m = mask >>> 0;
  if (m === 0) return 0;
  if (m === 0xffffffff) return 32;
  // popcount sur les bits à 1
  let count = 0;
  let x = m;
  while (x !== 0) {
    count += x & 1;
    x = x >>> 1;
  }
  return count;
}

/** Convertit une longueur de préfixe en masque entier. */
export function prefixToMask(prefix: Prefix): IPv4 {
  if (!isValidPrefix(prefix)) {
    throw new IpParseError(`Préfixe invalide : ${prefix}`);
  }
  if (prefix === 0) return 0 >>> 0;
  return ((0xffffffff << (32 - prefix)) >>> 0);
}
