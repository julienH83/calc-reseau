import { parseDottedIPv4 } from "./parse";
import {
  wildcardMask,
  toHex,
  toHexOctets,
  toUint32,
  toIPv4MappedIPv6,
  toReversePtr,
  aggregateSubnets,
  totalAddresses,
  isInNetwork,
  rangeText,
  previousNetwork,
  nextNetwork,
  ipDistance,
  longestCommonPrefixLength,
  commonNetwork,
  rangeToCidrs,
  defaultClassfulMask,
  dhcpScopeSuggestion,
  ciscoAclLine,
  usableHostsRfc3021,
  subnetCount,
} from "./extras";
import { toDotted } from "./format";

describe("wildcardMask", () => {
  it.each([
    [24, "0.0.0.255"],
    [16, "0.0.255.255"],
    [27, "0.0.0.31"],
    [0, "255.255.255.255"],
    [32, "0.0.0.0"],
  ])("/%i → %s", (prefix, expected) => {
    expect(toDotted(wildcardMask(prefix))).toBe(expected);
  });
});

describe("toHex / toHexOctets / toUint32", () => {
  const ip = parseDottedIPv4("192.168.1.10");
  it("hex 0x", () => expect(toHex(ip)).toBe("0xC0A8010A"));
  it("hex octets", () => expect(toHexOctets(ip)).toBe("C0.A8.01.0A"));
  it("uint", () => expect(toUint32(ip)).toBe("3232235786"));
});

describe("toIPv4MappedIPv6", () => {
  it("192.168.1.10 → ::ffff:c0a8:010a", () => {
    expect(toIPv4MappedIPv6(parseDottedIPv4("192.168.1.10"))).toBe("::ffff:c0a8:010a");
  });
  it("0.0.0.0 → ::ffff:0000:0000", () => {
    expect(toIPv4MappedIPv6(0)).toBe("::ffff:0000:0000");
  });
});

describe("toReversePtr", () => {
  it("/24", () => expect(toReversePtr(parseDottedIPv4("192.168.1.10"), 24)).toBe("1.168.192.in-addr.arpa"));
  it("/16", () => expect(toReversePtr(parseDottedIPv4("172.16.0.1"), 16)).toBe("16.172.in-addr.arpa"));
  it("/8", () => expect(toReversePtr(parseDottedIPv4("10.0.0.1"), 8)).toBe("10.in-addr.arpa"));
  it("/32", () => expect(toReversePtr(parseDottedIPv4("192.168.1.10"), 32)).toBe("10.1.168.192.in-addr.arpa"));
  it("/26 RFC 2317", () => expect(toReversePtr(parseDottedIPv4("192.168.1.0"), 26)).toBe("0/26.1.168.192.in-addr.arpa"));
});

describe("aggregateSubnets", () => {
  it("liste vide → null", () => {
    expect(aggregateSubnets([])).toBeNull();
  });
  it("192.168.0.0/24 + 192.168.1.0/24 → /23", () => {
    const r = aggregateSubnets([
      { ip: parseDottedIPv4("192.168.0.0"), prefix: 24 },
      { ip: parseDottedIPv4("192.168.1.0"), prefix: 24 },
    ])!;
    expect(toDotted(r.network)).toBe("192.168.0.0");
    expect(r.prefix).toBe(23);
  });
});

describe("totalAddresses", () => {
  it("/24 → 256", () => expect(totalAddresses(24)).toBe(256));
  it("/0 → 2^32", () => expect(totalAddresses(0)).toBe(4294967296));
});

describe("isInNetwork", () => {
  it("dans", () => expect(isInNetwork(parseDottedIPv4("192.168.1.10"), parseDottedIPv4("192.168.1.0"), 24)).toBe(true));
  it("dehors", () => expect(isInNetwork(parseDottedIPv4("192.168.2.10"), parseDottedIPv4("192.168.1.0"), 24)).toBe(false));
  it("limite basse incluse", () => expect(isInNetwork(parseDottedIPv4("192.168.1.0"), parseDottedIPv4("192.168.1.0"), 24)).toBe(true));
  it("limite haute incluse", () => expect(isInNetwork(parseDottedIPv4("192.168.1.255"), parseDottedIPv4("192.168.1.0"), 24)).toBe(true));
});

describe("rangeText", () => {
  it("192.168.1.0/24", () => {
    expect(rangeText(parseDottedIPv4("192.168.1.0"), 24)).toBe("192.168.1.0 — 192.168.1.255");
  });
});

describe("previousNetwork / nextNetwork", () => {
  it("précédent de 192.168.1.0/24 → 192.168.0.0/24", () => {
    const r = previousNetwork(parseDottedIPv4("192.168.1.0"), 24)!;
    expect(toDotted(r.network)).toBe("192.168.0.0");
  });
  it("suivant de 192.168.1.0/24 → 192.168.2.0/24", () => {
    const r = nextNetwork(parseDottedIPv4("192.168.1.0"), 24)!;
    expect(toDotted(r.network)).toBe("192.168.2.0");
  });
  it("précédent de 0.0.0.0/24 → null", () => {
    expect(previousNetwork(0, 24)).toBeNull();
  });
  it("suivant de 255.255.255.0/24 → null", () => {
    expect(nextNetwork(parseDottedIPv4("255.255.255.0"), 24)).toBeNull();
  });
  it("/0 sans voisin", () => {
    expect(previousNetwork(0, 0)).toBeNull();
    expect(nextNetwork(0, 0)).toBeNull();
  });
});

describe("ipDistance", () => {
  it("192.168.1.10 ↔ 192.168.1.20 = 10", () => {
    expect(
      ipDistance(parseDottedIPv4("192.168.1.10"), parseDottedIPv4("192.168.1.20")),
    ).toBe(10);
  });
  it("symétrique", () => {
    expect(
      ipDistance(parseDottedIPv4("192.168.1.20"), parseDottedIPv4("192.168.1.10")),
    ).toBe(10);
  });
});

describe("longestCommonPrefixLength / commonNetwork", () => {
  it("identiques → 32", () => {
    expect(
      longestCommonPrefixLength(
        parseDottedIPv4("192.168.1.10"),
        parseDottedIPv4("192.168.1.10"),
      ),
    ).toBe(32);
  });
  it("192.168.1.0 vs 192.168.1.128 → 24", () => {
    expect(
      longestCommonPrefixLength(
        parseDottedIPv4("192.168.1.0"),
        parseDottedIPv4("192.168.1.128"),
      ),
    ).toBe(24);
  });
  it("192.168.0.0 vs 192.168.1.0 → 23", () => {
    expect(
      longestCommonPrefixLength(
        parseDottedIPv4("192.168.0.0"),
        parseDottedIPv4("192.168.1.0"),
      ),
    ).toBe(23);
  });
  it("commonNetwork", () => {
    const r = commonNetwork(parseDottedIPv4("10.0.5.20"), parseDottedIPv4("10.0.5.30"));
    expect(r.prefix).toBeLessThanOrEqual(28);
    expect(toDotted(r.network).startsWith("10.0.5.")).toBe(true);
  });
});

describe("rangeToCidrs", () => {
  it("plage exacte = un /24", () => {
    const r = rangeToCidrs(parseDottedIPv4("192.168.1.0"), parseDottedIPv4("192.168.1.255"));
    expect(r).toHaveLength(1);
    expect(toDotted(r[0]!.network)).toBe("192.168.1.0");
    expect(r[0]!.prefix).toBe(24);
  });
  it("plage 192.168.1.10 → 192.168.1.50 = découpage minimal", () => {
    const r = rangeToCidrs(parseDottedIPv4("192.168.1.10"), parseDottedIPv4("192.168.1.50"));
    // Couvre exactement 41 adresses, doit couvrir [10, 50] et rien d'autre.
    let total = 0;
    for (const b of r) total += 2 ** (32 - b.prefix);
    expect(total).toBe(41);
    // Premier doit commencer à .10, dernier doit finir à .50
    expect(toDotted(r[0]!.network)).toBe("192.168.1.10");
    const last = r[r.length - 1]!;
    const lastEnd = (last.network + 2 ** (32 - last.prefix) - 1) >>> 0;
    expect(toDotted(lastEnd)).toBe("192.168.1.50");
  });
  it("plage [0,1] = un /31", () => {
    const r = rangeToCidrs(0, 1);
    expect(r).toHaveLength(1);
    expect(r[0]!.prefix).toBe(31);
  });
  it("rejette plage inverse", () => {
    expect(() => rangeToCidrs(10, 5)).toThrow();
  });
});

describe("defaultClassfulMask", () => {
  it.each([
    ["10.0.0.1", 8, "A"],
    ["172.16.0.1", 16, "B"],
    ["192.168.1.1", 24, "C"],
  ])("%s → /%i %s", (ip, prefix, ipClass) => {
    const r = defaultClassfulMask(parseDottedIPv4(ip))!;
    expect(r.prefix).toBe(prefix);
    expect(r.ipClass).toBe(ipClass);
  });
  it("classe D → null", () => {
    expect(defaultClassfulMask(parseDottedIPv4("224.0.0.1"))).toBeNull();
  });
});

describe("dhcpScopeSuggestion", () => {
  it("/24 → 3 plages", () => {
    const r = dhcpScopeSuggestion(parseDottedIPv4("192.168.1.0"), 24)!;
    expect(toDotted(r.staticRange.from)).toBe("192.168.1.1");
    expect(toDotted(r.dhcpRange.from)).toMatch(/^192\.168\.1\./);
    expect(toDotted(r.reservedRange.to)).toBe("192.168.1.254");
  });
  it("/31 → null", () => {
    expect(dhcpScopeSuggestion(0, 31)).toBeNull();
  });
});

describe("ciscoAclLine", () => {
  it("permit /24", () => {
    expect(ciscoAclLine(parseDottedIPv4("192.168.1.0"), 24)).toBe(
      "permit ip 192.168.1.0 0.0.0.255 any",
    );
  });
  it("deny /27", () => {
    expect(ciscoAclLine(parseDottedIPv4("10.0.0.0"), 27, "deny")).toBe(
      "deny ip 10.0.0.0 0.0.0.31 any",
    );
  });
  it("/32 → host", () => {
    expect(ciscoAclLine(parseDottedIPv4("8.8.8.8"), 32)).toBe("permit ip host 8.8.8.8 any");
  });
  it("/0 → any", () => {
    expect(ciscoAclLine(0, 0)).toBe("permit ip any any");
  });
});

describe("usableHostsRfc3021", () => {
  it("/24 = 254", () => expect(usableHostsRfc3021(24)).toBe(254));
  it("/30 = 2", () => expect(usableHostsRfc3021(30)).toBe(2));
  it("/31 = 2 (RFC 3021)", () => expect(usableHostsRfc3021(31)).toBe(2));
  it("/32 = 1 (host route)", () => expect(usableHostsRfc3021(32)).toBe(1));
});

describe("subnetCount", () => {
  it("/24 → /26 = 4", () => expect(subnetCount(24, 26)).toBe(4));
  it("/24 → /24 = 1", () => expect(subnetCount(24, 24)).toBe(1));
  it("/24 → /20 = 0", () => expect(subnetCount(24, 20)).toBe(0));
});
