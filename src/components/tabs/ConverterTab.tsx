"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/shared/CopyButton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import {
  isValidBinaryIPv4,
  isValidDottedIPv4,
} from "@/lib/ip/validate";
import { parseBinaryIPv4, parseDottedIPv4 } from "@/lib/ip/parse";
import { toBinaryDotted, toDotted } from "@/lib/ip/format";
import { toHex, toUint32 } from "@/lib/ip/extras";
import { sanitizeIPInput } from "@/hooks/useAutoFormatIP";

export function ConverterTab() {
  const [decimalInput, setDecimalInput] = React.useState("192.168.1.10");
  const [binaryInput, setBinaryInput] = React.useState("");

  const decimalToBinary = React.useMemo(() => {
    const trimmed = decimalInput.trim();
    if (trimmed === "") return { ok: true as const, value: "", hex: "", uint: "" };
    if (!isValidDottedIPv4(trimmed)) {
      return {
        ok: false as const,
        error: "Format attendu : 4 octets entre 0 et 255 séparés par des points (ex: 192.168.1.10).",
      };
    }
    const ip = parseDottedIPv4(trimmed);
    return {
      ok: true as const,
      value: toBinaryDotted(ip),
      hex: toHex(ip),
      uint: toUint32(ip),
    };
  }, [decimalInput]);

  const binaryToDecimal = React.useMemo(() => {
    const trimmed = binaryInput.trim();
    if (trimmed === "") return { ok: true as const, value: "", hex: "", uint: "" };
    if (!isValidBinaryIPv4(trimmed)) {
      return {
        ok: false as const,
        error:
          "Format attendu : 32 bits (0/1), avec ou sans points entre les octets (ex: 11000000.10101000.00000001.00001010).",
      };
    }
    const ip = parseBinaryIPv4(trimmed);
    return {
      ok: true as const,
      value: toDotted(ip),
      hex: toHex(ip),
      uint: toUint32(ip),
    };
  }, [binaryInput]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Décimale → Binaire</CardTitle>
          <CardDescription>
            Convertit une IPv4 en notation décimale pointée vers binaire, hexadécimal et entier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dec-input">IP décimale</Label>
            <Input
              id="dec-input"
              value={decimalInput}
              onChange={(e) => setDecimalInput(sanitizeIPInput(e.target.value))}
              placeholder="192.168.1.10"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
          {!decimalToBinary.ok && <ErrorMessage message={decimalToBinary.error} />}
          {decimalToBinary.ok && decimalToBinary.value && (
            <div className="space-y-3">
              <FormatRow label="Binaire" value={decimalToBinary.value} />
              <FormatRow label="Hexadécimal" value={decimalToBinary.hex} />
              <FormatRow label="Entier" value={decimalToBinary.uint} />
            </div>
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
              onChange={(e) => setBinaryInput(e.target.value)}
              placeholder="11000000.10101000.00000001.00001010"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
          {!binaryToDecimal.ok && <ErrorMessage message={binaryToDecimal.error} />}
          {binaryToDecimal.ok && binaryToDecimal.value && (
            <div className="space-y-3">
              <FormatRow label="Décimale" value={binaryToDecimal.value} />
              <FormatRow label="Hexadécimal" value={binaryToDecimal.hex} />
              <FormatRow label="Entier" value={binaryToDecimal.uint} />
            </div>
          )}
        </CardContent>
      </Card>
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
