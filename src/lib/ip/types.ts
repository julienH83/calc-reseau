/**
 * IPv4 représentée comme un entier 32 bits non signé (0..2^32-1).
 * On utilise toujours `>>> 0` pour rester en non signé après les opérations bitwise.
 */
export type IPv4 = number;

/** Longueur de préfixe CIDR (0..32). */
export type Prefix = number;

export type IPClass = "A" | "B" | "C" | "D" | "E";

export type IPType =
  | "public"
  | "private"
  | "loopback"
  | "apipa"
  | "multicast"
  | "reserved";

export interface NetworkInfo {
  /** IP saisie, normalisée. */
  ip: IPv4;
  /** Adresse réseau (IP & masque). */
  network: IPv4;
  /** Adresse de broadcast (réseau | ~masque). */
  broadcast: IPv4;
  /** Première IP utilisable (null pour /31 et /32). */
  firstHost: IPv4 | null;
  /** Dernière IP utilisable (null pour /31 et /32). */
  lastHost: IPv4 | null;
  /** Nombre d'hôtes utilisables (formule classique 2^h - 2). */
  usableHosts: number;
  /** Masque sous forme entière. */
  mask: IPv4;
  /** Longueur de préfixe. */
  prefix: Prefix;
  /** Classe historique (A/B/C/D/E). */
  ipClass: IPClass;
  /** Type d'adresse. */
  type: IPType;
}

export interface Subnet {
  index: number;
  network: IPv4;
  broadcast: IPv4;
  firstHost: IPv4 | null;
  lastHost: IPv4 | null;
  mask: IPv4;
  prefix: Prefix;
  usableHosts: number;
}

export interface SubdivisionRow {
  /** Nombre de sous-réseaux produits. */
  count: number;
  /** Nouveau préfixe CIDR. */
  newPrefix: Prefix;
  /** Masque correspondant. */
  mask: IPv4;
  /** Hôtes utilisables par sous-réseau. */
  hostsPerSubnet: number;
}
