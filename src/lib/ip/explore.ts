import { prefixToMask } from "./parse";
import { usableHostCount } from "./analyze";
import type { Prefix, SubdivisionRow } from "./types";

/**
 * Pour un réseau parent de préfixe `parentPrefix`, liste tous les découpages possibles
 * en 2, 4, 8, 16, ... sous-réseaux. Le tableau s'arrête dès que le nombre d'hôtes
 * utilisables passe sous `minHosts` (par défaut 2 — sinon le sous-réseau est inutilisable).
 */
export function exploreSubdivisions(
  parentPrefix: Prefix,
  minHosts: number = 2,
): SubdivisionRow[] {
  const rows: SubdivisionRow[] = [];
  let bits = 1;
  while (true) {
    const newPrefix = parentPrefix + bits;
    if (newPrefix > 32) break;
    const hostsPerSubnet = usableHostCount(newPrefix);
    if (hostsPerSubnet < minHosts) break;
    rows.push({
      count: 2 ** bits,
      newPrefix,
      mask: prefixToMask(newPrefix),
      hostsPerSubnet,
    });
    bits++;
  }
  return rows;
}
