import { prefixToMask } from "./parse";
import { toDotted } from "./format";
import type { IPClass, IPv4, Prefix } from "./types";

/** Masque inverse (wildcard mask) — utilisé dans les ACL Cisco. /24 → 0.0.0.255. */
export function wildcardMask(prefix: Prefix): IPv4 {
  return ((~prefixToMask(prefix)) >>> 0);
}

/** Représentation hexadécimale 0xC0A8010A. */
export function toHex(ip: IPv4): string {
  return "0x" + (ip >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

/** Hex par octet : "C0.A8.01.0A". */
export function toHexOctets(ip: IPv4): string {
  const x = ip >>> 0;
  return [
    ((x >>> 24) & 0xff).toString(16).toUpperCase().padStart(2, "0"),
    ((x >>> 16) & 0xff).toString(16).toUpperCase().padStart(2, "0"),
    ((x >>> 8) & 0xff).toString(16).toUpperCase().padStart(2, "0"),
    (x & 0xff).toString(16).toUpperCase().padStart(2, "0"),
  ].join(".");
}

/** Représentation entier non signé. */
export function toUint32(ip: IPv4): string {
  return String(ip >>> 0);
}

/** IPv4-mapped IPv6 (dual-stack). 192.168.1.10 → ::ffff:c0a8:010a. */
export function toIPv4MappedIPv6(ip: IPv4): string {
  const x = ip >>> 0;
  const high = ((x >>> 16) & 0xffff).toString(16).padStart(4, "0");
  const low = (x & 0xffff).toString(16).padStart(4, "0");
  return `::ffff:${high}:${low}`;
}

/**
 * Zone PTR pour reverse DNS.
 * Pour /8, /16, /24 on retourne le format classique (1.0.0.127.in-addr.arpa pour 127.0.0.1).
 * Pour les autres préfixes on retourne le format RFC 2317 (delegation classless).
 */
export function toReversePtr(ip: IPv4, prefix: Prefix): string {
  const x = ip >>> 0;
  const a = (x >>> 24) & 0xff;
  const b = (x >>> 16) & 0xff;
  const c = (x >>> 8) & 0xff;
  const d = x & 0xff;
  if (prefix === 8) return `${a}.in-addr.arpa`;
  if (prefix === 16) return `${b}.${a}.in-addr.arpa`;
  if (prefix === 24) return `${c}.${b}.${a}.in-addr.arpa`;
  if (prefix === 32) return `${d}.${c}.${b}.${a}.in-addr.arpa`;
  if (prefix > 24) return `${d}/${prefix}.${c}.${b}.${a}.in-addr.arpa`;
  if (prefix > 16) return `${c}/${prefix}.${b}.${a}.in-addr.arpa`;
  if (prefix > 8) return `${b}/${prefix}.${a}.in-addr.arpa`;
  return `${a}/${prefix}.in-addr.arpa`;
}

/**
 * Agrégation CIDR : trouve le plus petit super-réseau qui couvre tous les réseaux fournis.
 * Renvoie null si la liste est vide.
 */
export function aggregateSubnets(
  networks: { ip: IPv4; prefix: Prefix }[],
): { network: IPv4; prefix: Prefix } | null {
  if (networks.length === 0) return null;

  let minStart = 0xffffffff >>> 0;
  let maxEnd = 0 >>> 0;

  for (const { ip, prefix } of networks) {
    const mask = prefixToMask(prefix);
    const start = (ip & mask) >>> 0;
    const end = (start | (~mask >>> 0)) >>> 0;
    if (start < minStart) minStart = start;
    if (end > maxEnd) maxEnd = end;
  }

  const xor = (minStart ^ maxEnd) >>> 0;
  let commonPrefix = 32;
  for (let i = 31; i >= 0; i--) {
    if ((xor >>> i) & 1) {
      commonPrefix = 31 - i;
      break;
    }
  }
  if (xor === 0) commonPrefix = 32;

  const aggregateMask = commonPrefix === 0 ? 0 : ((0xffffffff << (32 - commonPrefix)) >>> 0);
  const network = (minStart & aggregateMask) >>> 0;
  return { network, prefix: commonPrefix };
}

/** Nombre total d'adresses dans un réseau (inclut réseau et broadcast). */
export function totalAddresses(prefix: Prefix): number {
  return 2 ** (32 - prefix);
}

/** Vrai si une IP est dans un réseau (ip ∈ network/prefix). */
export function isInNetwork(ip: IPv4, network: IPv4, prefix: Prefix): boolean {
  const mask = prefixToMask(prefix);
  return ((ip & mask) >>> 0) === ((network & mask) >>> 0);
}

/** Plage CIDR sous forme texte "192.168.1.0 — 192.168.1.255". */
export function rangeText(network: IPv4, prefix: Prefix): string {
  const mask = prefixToMask(prefix);
  const start = (network & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return `${toDotted(start)} — ${toDotted(end)}`;
}

/* ================================================================== *
 *  AJOUTS — voisinage, conversions, snippets pro, plages              *
 * ================================================================== */

/**
 * Réseau adjacent précédent au même préfixe. null si on est à 0.0.0.0.
 * Ex : 192.168.1.0/24 → 192.168.0.0/24
 */
export function previousNetwork(
  network: IPv4,
  prefix: Prefix,
): { network: IPv4; prefix: Prefix } | null {
  if (prefix === 0) return null;
  const size = 2 ** (32 - prefix);
  const start = (network >>> 0) - size;
  if (start < 0) return null;
  return { network: start >>> 0, prefix };
}

/**
 * Réseau adjacent suivant au même préfixe. null si on déborde de 255.255.255.255.
 * Ex : 192.168.1.0/24 → 192.168.2.0/24
 */
export function nextNetwork(
  network: IPv4,
  prefix: Prefix,
): { network: IPv4; prefix: Prefix } | null {
  if (prefix === 0) return null;
  const size = 2 ** (32 - prefix);
  const start = (network >>> 0) + size;
  if (start > 0xffffffff) return null;
  return { network: start >>> 0, prefix };
}

/** Distance entre deux IP (nombre d'adresses entre, valeur absolue). */
export function ipDistance(a: IPv4, b: IPv4): number {
  const x = a >>> 0;
  const y = b >>> 0;
  return Math.abs(x - y);
}

/**
 * Plus long préfixe commun (en bits) entre deux IP.
 * Ex : 192.168.1.0 et 192.168.1.128 → 24 (les 24 premiers bits sont identiques)
 */
export function longestCommonPrefixLength(a: IPv4, b: IPv4): Prefix {
  const xor = ((a ^ b) >>> 0);
  if (xor === 0) return 32;
  // Position du premier bit à 1 en partant de la gauche (MSB).
  for (let i = 31; i >= 0; i--) {
    if ((xor >>> i) & 1) return 31 - i;
  }
  return 32;
}

/** Plus petit réseau qui contient deux IP (network, prefix). */
export function commonNetwork(
  a: IPv4,
  b: IPv4,
): { network: IPv4; prefix: Prefix } {
  const prefix = longestCommonPrefixLength(a, b);
  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  return { network: (a & mask) >>> 0, prefix };
}

/**
 * Convertit une plage [start, end] en liste minimale de blocs CIDR.
 * Algorithme classique : à chaque étape, prend le plus grand bloc
 * aligné qui ne dépasse pas `end`.
 */
export function rangeToCidrs(
  start: IPv4,
  end: IPv4,
): { network: IPv4; prefix: Prefix }[] {
  let s = start >>> 0;
  const e = end >>> 0;
  if (s > e) throw new Error("Plage invalide : début > fin.");
  const blocks: { network: IPv4; prefix: Prefix }[] = [];
  while (s <= e) {
    // Bits d'alignement : nombre de zéros LSB de `s` (max 32).
    let alignBits = 32;
    if (s !== 0) {
      alignBits = 0;
      let n = s;
      while ((n & 1) === 0) {
        alignBits++;
        n >>>= 1;
      }
    }
    // Bits maximaux qui rentrent dans la fenêtre restante [s, e].
    // remaining = e - s + 1, on cherche le plus grand 2^k ≤ remaining.
    const remaining = e - s + 1;
    let maxBits = 0;
    while (2 ** (maxBits + 1) <= remaining) maxBits++;
    const bits = Math.min(alignBits, maxBits);
    const prefix = (32 - bits) as Prefix;
    blocks.push({ network: s, prefix });
    const size = 2 ** bits;
    s = (s + size) >>> 0;
    if (s === 0 && size === 0x100000000) break; // garde-fou /0
    if (s + size > 0x100000000) break;
  }
  return blocks;
}

/**
 * Masque par défaut classful (avant CIDR).
 * Renvoie null pour les classes D (multicast) et E (réservé).
 */
export function defaultClassfulMask(
  ip: IPv4,
): { prefix: Prefix; mask: IPv4; ipClass: IPClass } | null {
  const firstOctet = (ip >>> 24) & 0xff;
  if (firstOctet < 128) {
    return { prefix: 8, mask: prefixToMask(8), ipClass: "A" };
  }
  if (firstOctet < 192) {
    return { prefix: 16, mask: prefixToMask(16), ipClass: "B" };
  }
  if (firstOctet < 224) {
    return { prefix: 24, mask: prefixToMask(24), ipClass: "C" };
  }
  return null;
}

/**
 * Suggestion de plage DHCP raisonnable. Découpe la plage utilisable en 3 :
 *  - réservés statiques (premiers 20 %)
 *  - DHCP dynamique (60 % central)
 *  - réservations (20 % en fin)
 * Renvoie null si aucune plage utilisable (/31, /32).
 */
export function dhcpScopeSuggestion(
  network: IPv4,
  prefix: Prefix,
): {
  staticRange: { from: IPv4; to: IPv4 };
  dhcpRange: { from: IPv4; to: IPv4 };
  reservedRange: { from: IPv4; to: IPv4 };
} | null {
  if (prefix >= 31) return null;
  const mask = prefixToMask(prefix);
  const net = (network & mask) >>> 0;
  const broadcast = (net | (~mask >>> 0)) >>> 0;
  const firstHost = (net + 1) >>> 0;
  const lastHost = (broadcast - 1) >>> 0;
  const total = lastHost - firstHost + 1;
  if (total < 5) {
    // Trop petit pour proposer 3 zones — on met tout dans le DHCP et on ignore les autres.
    return {
      staticRange: { from: firstHost, to: firstHost },
      dhcpRange: { from: ((firstHost + 1) >>> 0), to: lastHost },
      reservedRange: { from: lastHost, to: lastHost },
    };
  }
  const staticEnd = (firstHost + Math.floor(total * 0.2) - 1) >>> 0;
  const reservedStart = (firstHost + Math.floor(total * 0.8)) >>> 0;
  return {
    staticRange: { from: firstHost, to: staticEnd },
    dhcpRange: { from: ((staticEnd + 1) >>> 0), to: ((reservedStart - 1) >>> 0) },
    reservedRange: { from: reservedStart, to: lastHost },
  };
}

/**
 * Génère une ligne d'ACL Cisco standard (style IOS).
 * Ex : "permit ip 192.168.1.0 0.0.0.255 any"
 */
export function ciscoAclLine(
  network: IPv4,
  prefix: Prefix,
  action: "permit" | "deny" = "permit",
): string {
  const mask = prefixToMask(prefix);
  const net = toDotted((network & mask) >>> 0);
  const wild = toDotted(((~mask) >>> 0));
  if (prefix === 32) return `${action} ip host ${net} any`;
  if (prefix === 0) return `${action} ip any any`;
  return `${action} ip ${net} ${wild} any`;
}

/**
 * Hôtes utilisables selon RFC 3021 : pour /31, on considère 2 hôtes (point-à-point).
 * Pour /32, 1 (host route).
 */
export function usableHostsRfc3021(prefix: Prefix): number {
  if (prefix === 32) return 1;
  if (prefix === 31) return 2;
  return 2 ** (32 - prefix) - 2;
}

/** Compte de sous-réseaux d'un préfixe enfant dans un réseau parent. */
export function subnetCount(parentPrefix: Prefix, childPrefix: Prefix): number {
  if (childPrefix < parentPrefix) return 0;
  return 2 ** (childPrefix - parentPrefix);
}
