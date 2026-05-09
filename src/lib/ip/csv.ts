import { toDotted } from "./format";
import type { Subnet } from "./types";

/** Échappe un champ CSV (RFC 4180). */
function esc(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const HEADERS = [
  "N°",
  "Adresse réseau",
  "CIDR",
  "Masque",
  "Première IP utilisable",
  "Dernière IP utilisable",
  "Broadcast",
  "Hôtes utilisables",
];

export function subnetsToCsv(subnets: Subnet[]): string {
  const lines: string[] = [];
  lines.push(HEADERS.map(esc).join(","));
  for (const s of subnets) {
    lines.push(
      [
        String(s.index),
        toDotted(s.network),
        `/${s.prefix}`,
        toDotted(s.mask),
        s.firstHost !== null ? toDotted(s.firstHost) : "—",
        s.lastHost !== null ? toDotted(s.lastHost) : "—",
        toDotted(s.broadcast),
        String(s.usableHosts),
      ]
        .map(esc)
        .join(","),
    );
  }
  // CRLF pour compatibilité Excel/Windows.
  return lines.join("\r\n");
}

/** Crée et déclenche le téléchargement du CSV (côté navigateur). */
export function downloadCsv(filename: string, content: string): void {
  // BOM UTF-8 pour qu'Excel reconnaisse les accents.
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
