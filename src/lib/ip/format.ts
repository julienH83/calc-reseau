import type { IPv4 } from "./types";

/** Entier 32 bits → "192.168.1.10". */
export function toDotted(ip: IPv4): string {
  const x = ip >>> 0;
  const a = (x >>> 24) & 0xff;
  const b = (x >>> 16) & 0xff;
  const c = (x >>> 8) & 0xff;
  const d = x & 0xff;
  return `${a}.${b}.${c}.${d}`;
}

/** Entier → "11000000.10101000.00000001.00001010". */
export function toBinaryDotted(ip: IPv4): string {
  return toBinaryOctets(ip).join(".");
}

/** Entier → ["11000000", "10101000", "00000001", "00001010"]. */
export function toBinaryOctets(ip: IPv4): string[] {
  const x = ip >>> 0;
  const octets: string[] = [];
  for (let i = 3; i >= 0; i--) {
    const oct = (x >>> (i * 8)) & 0xff;
    octets.push(oct.toString(2).padStart(8, "0"));
  }
  return octets;
}

/** Entier → string de 32 chars "0"/"1" sans séparateur. */
export function toBinaryRaw(ip: IPv4): string {
  return (ip >>> 0).toString(2).padStart(32, "0");
}

/**
 * Sépare les 32 bits d'une IP en "bits réseau" et "bits hôte" selon le préfixe.
 * Utile pour la coloration dans la vue binaire.
 */
export function toBinaryWithSplit(
  ip: IPv4,
  prefix: number,
): { bits: string; networkBits: number; hostBits: number } {
  const bits = toBinaryRaw(ip);
  return {
    bits,
    networkBits: prefix,
    hostBits: 32 - prefix,
  };
}
