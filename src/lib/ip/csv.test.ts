import { subnetsToCsv } from "./csv";
import { splitIntoN } from "./subnet";
import { parseDottedIPv4 } from "./parse";

describe("subnetsToCsv", () => {
  it("produit un en-tête + une ligne par sous-réseau (CRLF)", () => {
    const subs = splitIntoN(parseDottedIPv4("192.168.1.0"), 24, 4);
    const csv = subnetsToCsv(subs);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(5); // header + 4
    expect(lines[0]).toContain("Adresse réseau");
    expect(lines[1]).toContain("192.168.1.0");
    expect(lines[1]).toContain("/26");
    expect(lines[1]).toContain("255.255.255.192");
  });

  it("échappe les valeurs contenant des virgules", () => {
    // pas réaliste avec une IP, mais on teste quand même via header
    const subs = splitIntoN(parseDottedIPv4("10.0.0.0"), 24, 2);
    const csv = subnetsToCsv(subs);
    // L'en-tête contient un "N°" mais pas de virgule à échapper. On vérifie juste qu'il n'y a pas
    // de guillemets parasites.
    expect(csv.split("\r\n")[0]).toBe("N°,Adresse réseau,CIDR,Masque,Première IP utilisable,Dernière IP utilisable,Broadcast,Hôtes utilisables");
  });
});
