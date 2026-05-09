import { prefixToMask } from "./parse";
import { broadcastAddress, networkAddress, usableHostCount } from "./analyze";
import type { IPv4, Prefix, Subnet } from "./types";

export class SubnetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SubnetError";
  }
}

function buildSubnet(networkAddr: IPv4, prefix: Prefix, index: number): Subnet {
  const network = networkAddress(networkAddr, prefix);
  const broadcast = broadcastAddress(network, prefix);
  const mask = prefixToMask(prefix);
  const usableHosts = usableHostCount(prefix);
  const firstHost = prefix < 31 ? ((network + 1) >>> 0) : null;
  const lastHost = prefix < 31 ? ((broadcast - 1) >>> 0) : null;
  return { index, network, broadcast, firstHost, lastHost, mask, prefix, usableHosts };
}

/**
 * Mode A — Découpe un réseau en N sous-réseaux. Si N n'est pas une puissance de 2,
 * on remonte à la puissance de 2 supérieure (2^ceil(log2(N))). On retourne tous
 * les sous-réseaux générés (donc potentiellement plus que N).
 */
export function splitIntoN(
  parentIp: IPv4,
  parentPrefix: Prefix,
  n: number,
): Subnet[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new SubnetError("N doit être un entier ≥ 1");
  }
  const bits = n === 1 ? 0 : Math.ceil(Math.log2(n));
  const newPrefix = parentPrefix + bits;
  if (newPrefix > 32) {
    throw new SubnetError(
      `Impossible : un /${parentPrefix} ne peut pas être découpé en ${n} sous-réseaux (préfixe résultant /${newPrefix} > 32).`,
    );
  }
  const count = 2 ** bits;
  const blockSize = 2 ** (32 - newPrefix);
  const parentNet = networkAddress(parentIp, parentPrefix);
  const subnets: Subnet[] = [];
  for (let i = 0; i < count; i++) {
    const addr = ((parentNet + i * blockSize) >>> 0);
    subnets.push(buildSubnet(addr, newPrefix, i + 1));
  }
  return subnets;
}

/**
 * Mode B — Découpe en sous-réseaux capables d'accueillir au moins `minHosts` hôtes utilisables.
 * Choisit le préfixe le plus grand (= sous-réseau le plus petit) qui satisfait, et génère
 * tous les sous-réseaux du parent à ce préfixe.
 */
export function splitByHostCount(
  parentIp: IPv4,
  parentPrefix: Prefix,
  minHosts: number,
): Subnet[] {
  if (!Number.isInteger(minHosts) || minHosts < 1) {
    throw new SubnetError("Le nombre d'hôtes par sous-réseau doit être un entier ≥ 1");
  }
  // Bits hôtes nécessaires : 2^h - 2 ≥ minHosts → h ≥ ceil(log2(minHosts + 2))
  const hostBits = Math.ceil(Math.log2(minHosts + 2));
  const newPrefix = 32 - hostBits;
  if (newPrefix < parentPrefix) {
    throw new SubnetError(
      `Impossible : ${minHosts} hôtes par sous-réseau exigent un /${newPrefix}, mais le réseau parent est /${parentPrefix}.`,
    );
  }
  if (newPrefix > 30) {
    throw new SubnetError(
      `Impossible : ${minHosts} hôtes ne tiennent pas dans un sous-réseau utilisable (préfixe résultant /${newPrefix}).`,
    );
  }
  const bits = newPrefix - parentPrefix;
  const count = 2 ** bits;
  const blockSize = 2 ** (32 - newPrefix);
  const parentNet = networkAddress(parentIp, parentPrefix);
  const subnets: Subnet[] = [];
  for (let i = 0; i < count; i++) {
    const addr = ((parentNet + i * blockSize) >>> 0);
    subnets.push(buildSubnet(addr, newPrefix, i + 1));
  }
  return subnets;
}

/**
 * Mode C — VLSM (Variable Length Subnet Mask).
 * `requirements` : liste de besoins (nombres d'hôtes nécessaires par sous-réseau).
 * On trie en ordre décroissant, on alloue le plus gros en premier au début du parent,
 * puis on avance le pointeur. La sortie conserve l'ordre d'origine des `requirements`
 * via le champ `originalIndex`.
 */
export interface VlsmSubnet extends Subnet {
  /** Index dans le tableau `requirements` d'origine (0-based). */
  originalIndex: number;
  /** Besoin hôtes demandé pour ce sous-réseau. */
  requestedHosts: number;
}

export function vlsm(
  parentIp: IPv4,
  parentPrefix: Prefix,
  requirements: number[],
): VlsmSubnet[] {
  if (requirements.length === 0) {
    throw new SubnetError("La liste des besoins est vide.");
  }
  for (const r of requirements) {
    if (!Number.isInteger(r) || r < 1) {
      throw new SubnetError(`Besoin invalide : ${r} (entier ≥ 1 attendu)`);
    }
  }

  // On garde l'index d'origine pour réordonner à la fin.
  const indexed = requirements.map((hosts, originalIndex) => ({ hosts, originalIndex }));
  // Tri décroissant — clé pour l'alignement VLSM.
  const sorted = [...indexed].sort((a, b) => b.hosts - a.hosts);

  const parentNet = networkAddress(parentIp, parentPrefix);
  const parentBroadcast = broadcastAddress(parentNet, parentPrefix);
  let cursor = parentNet >>> 0;

  const allocated: VlsmSubnet[] = [];
  for (const req of sorted) {
    const hostBits = Math.ceil(Math.log2(req.hosts + 2));
    const newPrefix = 32 - hostBits;
    if (newPrefix < parentPrefix) {
      throw new SubnetError(
        `Sous-réseau de ${req.hosts} hôtes nécessite un /${newPrefix}, plus large que le parent /${parentPrefix}.`,
      );
    }
    if (newPrefix > 30) {
      throw new SubnetError(
        `Sous-réseau de ${req.hosts} hôtes : préfixe résultant /${newPrefix} non utilisable.`,
      );
    }
    const blockSize = 2 ** (32 - newPrefix);
    // Aligner le curseur sur un multiple de blockSize.
    const aligned = (Math.ceil(cursor / blockSize) * blockSize) >>> 0;
    const broadcast = ((aligned + blockSize - 1) >>> 0);
    if (broadcast > parentBroadcast) {
      throw new SubnetError(
        `VLSM : la liste des besoins ne tient pas dans le réseau parent /${parentPrefix}.`,
      );
    }
    const subnet = buildSubnet(aligned, newPrefix, 0);
    allocated.push({
      ...subnet,
      originalIndex: req.originalIndex,
      requestedHosts: req.hosts,
    });
    cursor = ((broadcast + 1) >>> 0);
  }

  // Réordonner selon l'ordre d'origine et numéroter.
  allocated.sort((a, b) => a.originalIndex - b.originalIndex);
  return allocated.map((s, i) => ({ ...s, index: i + 1 }));
}
