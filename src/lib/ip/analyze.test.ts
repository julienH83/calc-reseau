import { parseDottedIPv4 } from "./parse";
import {
  analyze,
  broadcastAddress,
  ipClass,
  ipType,
  networkAddress,
  usableHostCount,
} from "./analyze";
import { toDotted } from "./format";

describe("networkAddress", () => {
  it("192.168.1.10/24 → 192.168.1.0", () => {
    const ip = parseDottedIPv4("192.168.1.10");
    expect(toDotted(networkAddress(ip, 24))).toBe("192.168.1.0");
  });
  it("10.20.30.40/12 → 10.16.0.0", () => {
    const ip = parseDottedIPv4("10.20.30.40");
    expect(toDotted(networkAddress(ip, 12))).toBe("10.16.0.0");
  });
});

describe("broadcastAddress", () => {
  it("192.168.1.10/24 → 192.168.1.255", () => {
    const ip = parseDottedIPv4("192.168.1.10");
    expect(toDotted(broadcastAddress(ip, 24))).toBe("192.168.1.255");
  });
  it("172.16.5.5/12 → 172.31.255.255", () => {
    const ip = parseDottedIPv4("172.16.5.5");
    expect(toDotted(broadcastAddress(ip, 12))).toBe("172.31.255.255");
  });
});

describe("usableHostCount", () => {
  it.each([
    [24, 254],
    [16, 65534],
    [8, 16777214],
    [30, 2],
    [29, 6],
    [31, 0],
    [32, 0],
    [0, 4294967294],
  ])("préfixe %i → %i hôtes", (prefix, expected) => {
    expect(usableHostCount(prefix)).toBe(expected);
  });
});

describe("ipClass", () => {
  it.each([
    ["10.0.0.1", "A"],
    ["127.0.0.1", "A"],
    ["128.0.0.1", "B"],
    ["172.16.0.1", "B"],
    ["191.255.255.255", "B"],
    ["192.0.0.1", "C"],
    ["223.255.255.255", "C"],
    ["224.0.0.1", "D"],
    ["239.255.255.255", "D"],
    ["240.0.0.1", "E"],
    ["255.255.255.255", "E"],
  ])("%s est de classe %s", (ip, expected) => {
    expect(ipClass(parseDottedIPv4(ip))).toBe(expected);
  });
});

describe("ipType", () => {
  it.each<[string, ReturnType<typeof ipType>]>([
    ["10.1.2.3", "private"],
    ["172.16.0.1", "private"],
    ["172.31.255.255", "private"],
    ["172.32.0.1", "public"],
    ["192.168.1.1", "private"],
    ["127.0.0.1", "loopback"],
    ["169.254.1.1", "apipa"],
    ["8.8.8.8", "public"],
    ["224.0.0.1", "multicast"],
    ["239.255.255.250", "multicast"],
    ["240.0.0.1", "reserved"],
    ["0.1.2.3", "reserved"],
  ])("%s → %s", (ip, expected) => {
    expect(ipType(parseDottedIPv4(ip))).toBe(expected);
  });
});

describe("analyze", () => {
  it("192.168.1.10/24 — cas standard", () => {
    const info = analyze(parseDottedIPv4("192.168.1.10"), 24);
    expect(toDotted(info.network)).toBe("192.168.1.0");
    expect(toDotted(info.broadcast)).toBe("192.168.1.255");
    expect(toDotted(info.firstHost!)).toBe("192.168.1.1");
    expect(toDotted(info.lastHost!)).toBe("192.168.1.254");
    expect(info.usableHosts).toBe(254);
    expect(info.prefix).toBe(24);
    expect(info.ipClass).toBe("C");
    expect(info.type).toBe("private");
  });
  it("10.0.0.1/30 — minuscule", () => {
    const info = analyze(parseDottedIPv4("10.0.0.1"), 30);
    expect(toDotted(info.network)).toBe("10.0.0.0");
    expect(toDotted(info.broadcast)).toBe("10.0.0.3");
    expect(toDotted(info.firstHost!)).toBe("10.0.0.1");
    expect(toDotted(info.lastHost!)).toBe("10.0.0.2");
    expect(info.usableHosts).toBe(2);
  });
  it("/31 — pas d'hôtes utilisables (formule classique)", () => {
    const info = analyze(parseDottedIPv4("10.0.0.0"), 31);
    expect(info.firstHost).toBeNull();
    expect(info.lastHost).toBeNull();
    expect(info.usableHosts).toBe(0);
  });
  it("/32 — host route", () => {
    const info = analyze(parseDottedIPv4("10.0.0.5"), 32);
    expect(info.firstHost).toBeNull();
    expect(info.lastHost).toBeNull();
    expect(info.usableHosts).toBe(0);
    expect(toDotted(info.network)).toBe("10.0.0.5");
    expect(toDotted(info.broadcast)).toBe("10.0.0.5");
  });
});
