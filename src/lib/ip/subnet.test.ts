import { parseDottedIPv4 } from "./parse";
import { splitIntoN, splitByHostCount, vlsm, SubnetError } from "./subnet";
import { toDotted } from "./format";

describe("splitIntoN", () => {
  it("192.168.1.0/24 en 4 → /26", () => {
    const subs = splitIntoN(parseDottedIPv4("192.168.1.0"), 24, 4);
    expect(subs).toHaveLength(4);
    expect(subs.map((s) => toDotted(s.network))).toEqual([
      "192.168.1.0",
      "192.168.1.64",
      "192.168.1.128",
      "192.168.1.192",
    ]);
    expect(subs.every((s) => s.prefix === 26)).toBe(true);
    expect(subs[0]!.usableHosts).toBe(62);
  });

  it("arrondit à la puissance de 2 supérieure (3 → 4)", () => {
    const subs = splitIntoN(parseDottedIPv4("10.0.0.0"), 24, 3);
    expect(subs).toHaveLength(4);
    expect(subs[0]!.prefix).toBe(26);
  });

  it("rejette si le préfixe résultant > 32", () => {
    expect(() => splitIntoN(parseDottedIPv4("192.168.1.0"), 30, 16)).toThrow(SubnetError);
  });

  it("première et dernière IP correctes", () => {
    const subs = splitIntoN(parseDottedIPv4("192.168.1.0"), 24, 4);
    expect(toDotted(subs[1]!.firstHost!)).toBe("192.168.1.65");
    expect(toDotted(subs[1]!.lastHost!)).toBe("192.168.1.126");
    expect(toDotted(subs[1]!.broadcast)).toBe("192.168.1.127");
  });
});

describe("splitByHostCount", () => {
  it("192.168.1.0/24 avec 50 hôtes → /26 (62 hôtes), 4 sous-réseaux", () => {
    const subs = splitByHostCount(parseDottedIPv4("192.168.1.0"), 24, 50);
    expect(subs).toHaveLength(4);
    expect(subs.every((s) => s.prefix === 26)).toBe(true);
    expect(subs[0]!.usableHosts).toBe(62);
  });

  it("192.168.1.0/24 avec 30 hôtes → /27 (30 hôtes), 8 sous-réseaux", () => {
    const subs = splitByHostCount(parseDottedIPv4("192.168.1.0"), 24, 30);
    expect(subs).toHaveLength(8);
    expect(subs.every((s) => s.prefix === 27)).toBe(true);
  });

  it("rejette si trop d'hôtes pour le parent", () => {
    expect(() => splitByHostCount(parseDottedIPv4("192.168.1.0"), 24, 1000)).toThrow(SubnetError);
  });
});

describe("vlsm", () => {
  it("192.168.1.0/24 avec [50,25,10,2]", () => {
    const subs = vlsm(parseDottedIPv4("192.168.1.0"), 24, [50, 25, 10, 2]);
    expect(subs).toHaveLength(4);

    // Le besoin de 50 → /26 (62 hôtes), placé en premier
    const s50 = subs.find((s) => s.requestedHosts === 50)!;
    expect(s50.prefix).toBe(26);
    expect(toDotted(s50.network)).toBe("192.168.1.0");
    expect(toDotted(s50.broadcast)).toBe("192.168.1.63");

    // 25 → /27 (30 hôtes)
    const s25 = subs.find((s) => s.requestedHosts === 25)!;
    expect(s25.prefix).toBe(27);
    expect(toDotted(s25.network)).toBe("192.168.1.64");

    // 10 → /28 (14 hôtes)
    const s10 = subs.find((s) => s.requestedHosts === 10)!;
    expect(s10.prefix).toBe(28);
    expect(toDotted(s10.network)).toBe("192.168.1.96");

    // 2 → /30 (2 hôtes)
    const s2 = subs.find((s) => s.requestedHosts === 2)!;
    expect(s2.prefix).toBe(30);
    expect(toDotted(s2.network)).toBe("192.168.1.112");
  });

  it("conserve l'ordre d'origine des besoins", () => {
    const subs = vlsm(parseDottedIPv4("192.168.1.0"), 24, [10, 50, 2, 25]);
    expect(subs.map((s) => s.requestedHosts)).toEqual([10, 50, 2, 25]);
    expect(subs.map((s) => s.originalIndex)).toEqual([0, 1, 2, 3]);
  });

  it("rejette si la liste ne tient pas dans le parent", () => {
    expect(() => vlsm(parseDottedIPv4("192.168.1.0"), 24, [100, 100, 100])).toThrow(SubnetError);
  });

  it("rejette un besoin trop gros pour le parent", () => {
    expect(() => vlsm(parseDottedIPv4("192.168.1.0"), 24, [500])).toThrow(SubnetError);
  });

  it("rejette un besoin nul ou négatif", () => {
    expect(() => vlsm(parseDottedIPv4("192.168.1.0"), 24, [0])).toThrow(SubnetError);
    expect(() => vlsm(parseDottedIPv4("192.168.1.0"), 24, [-1])).toThrow(SubnetError);
  });

  it("rejette une liste vide", () => {
    expect(() => vlsm(parseDottedIPv4("192.168.1.0"), 24, [])).toThrow(SubnetError);
  });
});
