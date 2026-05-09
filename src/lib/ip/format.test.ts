import { toDotted, toBinaryDotted, toBinaryOctets, toBinaryRaw } from "./format";

describe("toDotted", () => {
  it("0 → 0.0.0.0", () => {
    expect(toDotted(0)).toBe("0.0.0.0");
  });
  it("0xFFFFFFFF → 255.255.255.255", () => {
    expect(toDotted(0xffffffff)).toBe("255.255.255.255");
  });
  it("0xC0A8010A → 192.168.1.10", () => {
    expect(toDotted(0xc0a8010a)).toBe("192.168.1.10");
  });
});

describe("toBinaryDotted", () => {
  it("192.168.1.10 → 11000000.10101000.00000001.00001010", () => {
    expect(toBinaryDotted(0xc0a8010a)).toBe("11000000.10101000.00000001.00001010");
  });
  it("0 → 32 zéros séparés", () => {
    expect(toBinaryDotted(0)).toBe("00000000.00000000.00000000.00000000");
  });
});

describe("toBinaryOctets", () => {
  it("retourne 4 octets de 8 bits", () => {
    const octets = toBinaryOctets(0xc0a8010a);
    expect(octets).toEqual(["11000000", "10101000", "00000001", "00001010"]);
  });
});

describe("toBinaryRaw", () => {
  it("renvoie 32 chars", () => {
    expect(toBinaryRaw(0xc0a8010a)).toBe("11000000101010000000000100001010");
    expect(toBinaryRaw(0).length).toBe(32);
  });
});
