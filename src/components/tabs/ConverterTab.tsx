"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "@/components/shared/CopyButton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import {
  isValidBinaryIPv4,
  isValidDottedIPv4,
} from "@/lib/ip/validate";
import { parseBinaryIPv4, parseDottedIPv4 } from "@/lib/ip/parse";
import { toBinaryDotted, toDotted } from "@/lib/ip/format";
import { sanitizeIPInput } from "@/hooks/useAutoFormatIP";

const POWERS = [128, 64, 32, 16, 8, 4, 2, 1] as const;

export function ConverterTab() {
  const [decimalInput, setDecimalInput] = React.useState("192.168.1.10");
  const [binaryInput, setBinaryInput] = React.useState("");
  const [lastEdited, setLastEdited] = React.useState<"decimal" | "binary">("decimal");

  const decimalToBinary = React.useMemo<
    { ok: true; value: string; ip: number | null } | { ok: false; error: string }
  >(() => {
    const trimmed = decimalInput.trim();
    if (trimmed === "") return { ok: true, value: "", ip: null };
    if (!isValidDottedIPv4(trimmed)) {
      return {
        ok: false,
        error: "Format attendu : 4 octets entre 0 et 255 séparés par des points (ex: 192.168.1.10).",
      };
    }
    const ip = parseDottedIPv4(trimmed);
    return { ok: true, value: toBinaryDotted(ip), ip };
  }, [decimalInput]);

  const binaryToDecimal = React.useMemo<
    { ok: true; value: string; ip: number | null } | { ok: false; error: string }
  >(() => {
    const trimmed = binaryInput.trim();
    if (trimmed === "") return { ok: true, value: "", ip: null };
    if (!isValidBinaryIPv4(trimmed)) {
      return {
        ok: false,
        error:
          "Format attendu : 32 bits (0/1), avec ou sans points entre les octets (ex: 11000000.10101000.00000001.00001010).",
      };
    }
    const ip = parseBinaryIPv4(trimmed);
    return { ok: true, value: toDotted(ip), ip };
  }, [binaryInput]);

  // IP active à afficher dans le tableau de puissances : on prend la dernière saisie valide.
  const activeIp = React.useMemo<number | null>(() => {
    const decIp = decimalToBinary.ok ? decimalToBinary.ip : null;
    const binIp = binaryToDecimal.ok ? binaryToDecimal.ip : null;
    if (lastEdited === "binary" && binIp !== null) return binIp;
    if (decIp !== null) return decIp;
    if (binIp !== null) return binIp;
    return null;
  }, [lastEdited, decimalToBinary, binaryToDecimal]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Décimale → Binaire</CardTitle>
            <CardDescription>
              Convertit une IPv4 en notation décimale pointée vers binaire.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dec-input">IP décimale</Label>
              <Input
                id="dec-input"
                value={decimalInput}
                onChange={(e) => {
                  setDecimalInput(sanitizeIPInput(e.target.value));
                  setLastEdited("decimal");
                }}
                onFocus={handleFocus}
                placeholder="192.168.1.10"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                className="font-mono-tabular"
              />
            </div>
            {!decimalToBinary.ok && <ErrorMessage message={decimalToBinary.error} />}
            {decimalToBinary.ok && decimalToBinary.value && (
              <FormatRow label="Binaire" value={decimalToBinary.value} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Binaire → Décimale</CardTitle>
            <CardDescription>
              Accepte 32 bits (0/1), avec ou sans séparateurs entre les octets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bin-input">IP binaire</Label>
              <Input
                id="bin-input"
                value={binaryInput}
                onChange={(e) => {
                  setBinaryInput(e.target.value);
                  setLastEdited("binary");
                }}
                onFocus={handleFocus}
                placeholder="11000000.10101000.00000001.00001010"
                autoComplete="off"
                spellCheck={false}
                className="font-mono-tabular"
              />
            </div>
            {!binaryToDecimal.ok && <ErrorMessage message={binaryToDecimal.error} />}
            {binaryToDecimal.ok && binaryToDecimal.value && (
              <FormatRow label="Décimale" value={binaryToDecimal.value} />
            )}
          </CardContent>
        </Card>
      </div>

      {activeIp !== null && <PowersTable ip={activeIp} />}
    </div>
  );
}

function FormatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
        <code className="grow break-all font-mono-tabular text-sm sm:text-base">{value}</code>
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

/**
 * Tableau de décomposition en puissances de 2 par octet.
 * Pour chaque octet, on affiche les bits positionnés sous chaque puissance (128, 64, ..., 1).
 * Pratique pour les calculs manuels sur le terrain.
 */
function PowersTable({ ip }: { ip: number }) {
  const x = ip >>> 0;
  const octets = [
    (x >>> 24) & 0xff,
    (x >>> 16) & 0xff,
    (x >>> 8) & 0xff,
    x & 0xff,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Décomposition par puissances de 2</CardTitle>
        <CardDescription>
          Chaque colonne représente une puissance de 2. La valeur décimale d&apos;un octet est la
          somme des puissances dont la cellule vaut 1. Utile pour les calculs manuels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="font-mono-tabular text-center">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Octet</TableHead>
              <TableHead className="text-center">Valeur décimale</TableHead>
              {POWERS.map((p, i) => (
                <TableHead key={p} className="text-center">
                  <div className="font-semibold text-foreground">{p}</div>
                  <div className="text-xs text-muted-foreground">2{toSuperscript(7 - i)}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {octets.map((value, idx) => {
              const bits = value.toString(2).padStart(8, "0").split("");
              return (
                <TableRow key={idx}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell className="font-semibold text-foreground">{value}</TableCell>
                  {bits.map((bit, j) => (
                    <TableCell
                      key={j}
                      className={
                        bit === "1"
                          ? "font-semibold text-primary"
                          : "text-muted-foreground/60"
                      }
                    >
                      {bit}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const SUPERSCRIPTS = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
function toSuperscript(n: number): string {
  return String(n)
    .split("")
    .map((c) => SUPERSCRIPTS[Number(c)] ?? c)
    .join("");
}
