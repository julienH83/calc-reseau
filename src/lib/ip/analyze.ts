import { prefixToMask } from "./parse";
import type { IPClass, IPType, IPv4, NetworkInfo, Prefix } from "./types";

/** Calcule l'adresse réseau (IP & masque). */
export function networkAddress(ip: IPv4, prefix: Prefix): IPv4 {
  const mask = prefixToMask(prefix);
  return ((ip & mask) >>> 0);
}

/** Calcule l'adresse de broadcast (réseau | ~masque). */
export function broadcastAddress(ip: IPv4, prefix: Prefix): IPv4 {
  const net = networkAddress(ip, prefix);
  const inverseMask = (~prefixToMask(prefix)) >>> 0;
  return ((net | inverseMask) >>> 0);
}

/**
 * Nombre d'hôtes utilisables — formule classique 2^h - 2.
 * /31 → 0 (point-à-point spécial), /32 → 0 (host route).
 */
export function usableHostCount(prefix: Prefix): number {
  if (prefix >= 31) return 0;
  const hostBits = 32 - prefix;
  return 2 ** hostBits - 2;
}

export function ipClass(ip: IPv4): IPClass {
  const firstOctet = (ip >>> 24) & 0xff;
  if (firstOctet < 128) return "A";
  if (firstOctet < 192) return "B";
  if (firstOctet < 224) return "C";
  if (firstOctet < 240) return "D";
  return "E";
}

/** Compare deux IP en non signé : -1, 0, 1. */
function cmp(a: IPv4, b: IPv4): number {
  const x = a >>> 0;
  const y = b >>> 0;
  return x < y ? -1 : x > y ? 1 : 0;
}

function inRange(ip: IPv4, startStr: string, prefix: Prefix): boolean {
  const start = parseDottedForRange(startStr);
  const mask = prefixToMask(prefix);
  return ((ip & mask) >>> 0) === ((start & mask) >>> 0);
}

function parseDottedForRange(s: string): IPv4 {
  const [a, b, c, d] = s.split(".").map(Number);
  return (((a! << 24) | (b! << 16) | (c! << 8) | d!) >>> 0);
}

export function ipType(ip: IPv4): IPType {
  // Loopback : 127.0.0.0/8
  if (inRange(ip, "127.0.0.0", 8)) return "loopback";
  // APIPA : 169.254.0.0/16
  if (inRange(ip, "169.254.0.0", 16)) return "apipa";
  // Privées RFC 1918
  if (inRange(ip, "10.0.0.0", 8)) return "private";
  if (inRange(ip, "172.16.0.0", 12)) return "private";
  if (inRange(ip, "192.168.0.0", 16)) return "private";
  // Multicast (classe D)
  if (inRange(ip, "224.0.0.0", 4)) return "multicast";
  // Réservées (classe E + 0.0.0.0/8 + 255.255.255.255)
  if (inRange(ip, "240.0.0.0", 4)) return "reserved";
  if (inRange(ip, "0.0.0.0", 8)) return "reserved";
  return "public";
}

export function analyze(ip: IPv4, prefix: Prefix): NetworkInfo {
  const network = networkAddress(ip, prefix);
  const broadcast = broadcastAddress(ip, prefix);
  const mask = prefixToMask(prefix);
  const usableHosts = usableHostCount(prefix);

  let firstHost: IPv4 | null = null;
  let lastHost: IPv4 | null = null;
  if (prefix < 31) {
    firstHost = ((network + 1) >>> 0);
    lastHost = ((broadcast - 1) >>> 0);
  }

  return {
    ip: ip >>> 0,
    network,
    broadcast,
    firstHost,
    lastHost,
    usableHosts,
    mask,
    prefix,
    ipClass: ipClass(ip),
    type: ipType(ip),
  };
}

export { cmp as compareIPs };
