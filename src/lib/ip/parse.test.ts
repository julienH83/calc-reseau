import {
  parseDottedIPv4,
  parseBinaryIPv4,
  parseMask,
  parseCIDR,
  prefixToMask,
  maskToPrefix,
  IpParseError,
} from "./parse";

describe("parseDottedIPv4", () => {
  it("parse 0.0.0.0", () => {
    expect(parseDottedIPv4("0.0.0.0")).toBe(0);
  });
  it("parse 255.255.255.255", () => {
    expect(parseDottedIPv4("255.255.255.255")).toBe(0xffffffff);
  });
  it("parse 192.168.1.10", () => {
    expect(parseDottedIPv4("192.168.1.10")).toBe(0xc0a8010a);
  });
  it("trim les espaces", () => {
    expect(parseDottedIPv4("  192.168.1.10  ")).toBe(0xc0a8010a);
  });
  it("rejette format invalide", () => {
    expect(() => parseDottedIPv4("192.168.1")).toThrow(IpParseError);
  });
});

describe("parseBinaryIPv4", () => {
  it("parse avec points", () => {
    expect(parseBinaryIPv4("11000000.10101000.00000001.00001010")).toBe(0xc0a8010a);
  });
  it("parse sans séparateur", () => {
    expect(parseBinaryIPv4("11000000101010000000000100001010")).toBe(0xc0a8010a);
  });
  it("parse 11111111.11111111.11111111.11111111", () => {
    expect(parseBinaryIPv4("11111111.11111111.11111111.11111111")).toBe(0xffffffff);
  });
  it("rejette format invalide", () => {
    expect(() => parseBinaryIPv4("110000.10101000.00000001.00001010")).toThrow(IpParseError);
  });
});

describe("prefixToMask", () => {
  it("prefix 0 → 0", () => {
    expect(prefixToMask(0)).toBe(0);
  });
  it("prefix 8 → 0xFF000000", () => {
    expect(prefixToMask(8)).toBe(0xff000000);
  });
  it("prefix 16 → 0xFFFF0000", () => {
    expect(prefixToMask(16)).toBe(0xffff0000);
  });
  it("prefix 24 → 0xFFFFFF00", () => {
    expect(prefixToMask(24)).toBe(0xffffff00);
  });
  it("prefix 27 → 0xFFFFFFE0", () => {
    expect(prefixToMask(27)).toBe(0xffffffe0);
  });
  it("prefix 32 → 0xFFFFFFFF", () => {
    expect(prefixToMask(32)).toBe(0xffffffff);
  });
});

describe("maskToPrefix", () => {
  it("0 → 0", () => {
    expect(maskToPrefix(0)).toBe(0);
  });
  it("0xFFFFFF00 → 24", () => {
    expect(maskToPrefix(0xffffff00)).toBe(24);
  });
  it("0xFFFFFFFF → 32", () => {
    expect(maskToPrefix(0xffffffff)).toBe(32);
  });
  it("0xFFFFFFE0 → 27", () => {
    expect(maskToPrefix(0xffffffe0)).toBe(27);
  });
});

describe("parseMask", () => {
  it("parse /24", () => {
    expect(parseMask("/24")).toBe(24);
  });
  it("parse 24", () => {
    expect(parseMask("24")).toBe(24);
  });
  it("parse 255.255.255.0", () => {
    expect(parseMask("255.255.255.0")).toBe(24);
  });
  it("parse 255.255.255.224", () => {
    expect(parseMask("255.255.255.224")).toBe(27);
  });
  it("rejette masque non contigu", () => {
    expect(() => parseMask("255.255.0.255")).toThrow(IpParseError);
  });
  it("rejette préfixe hors plage", () => {
    expect(() => parseMask("/33")).toThrow(IpParseError);
  });
});

describe("parseCIDR", () => {
  it("parse 192.168.1.0/24", () => {
    expect(parseCIDR("192.168.1.0/24")).toEqual({ ip: 0xc0a80100, prefix: 24 });
  });
  it("rejette sans slash", () => {
    expect(() => parseCIDR("192.168.1.0")).toThrow(IpParseError);
  });
  it("rejette IP invalide", () => {
    expect(() => parseCIDR("256.0.0.0/24")).toThrow(IpParseError);
  });
});
