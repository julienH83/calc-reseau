import {
  isValidDottedIPv4,
  isValidBinaryIPv4,
  isContiguousMask,
  isValidMask,
  isValidPrefix,
  isValidCIDR,
} from "./validate";

describe("isValidDottedIPv4", () => {
  it.each([
    "0.0.0.0",
    "255.255.255.255",
    "192.168.1.1",
    "10.0.0.1",
    "172.16.0.1",
  ])("accepte %s", (input) => {
    expect(isValidDottedIPv4(input)).toBe(true);
  });

  it.each([
    "",
    "192.168.1",
    "192.168.1.1.1",
    "256.0.0.0",
    "192.168.01.1", // leading zero refusé
    "192.168.1.-1",
    "192.168.1.a",
    "192,168,1,1",
    "1000.0.0.0",
    "  ",
  ])("refuse %s", (input) => {
    expect(isValidDottedIPv4(input)).toBe(false);
  });
});

describe("isValidBinaryIPv4", () => {
  it("accepte avec points", () => {
    expect(isValidBinaryIPv4("11000000.10101000.00000001.00001010")).toBe(true);
  });
  it("accepte sans séparateur", () => {
    expect(isValidBinaryIPv4("11000000101010000000000100001010")).toBe(true);
  });
  it("accepte avec espaces", () => {
    expect(isValidBinaryIPv4("11000000 10101000 00000001 00001010")).toBe(true);
  });
  it("refuse 31 bits", () => {
    expect(isValidBinaryIPv4("1100000010101000000000010000101")).toBe(false);
  });
  it("refuse caractères non binaires", () => {
    expect(isValidBinaryIPv4("11000000.10101000.00000002.00001010")).toBe(false);
  });
});

describe("isValidPrefix", () => {
  it("accepte 0..32", () => {
    for (let i = 0; i <= 32; i++) expect(isValidPrefix(i)).toBe(true);
  });
  it("refuse hors plage", () => {
    expect(isValidPrefix(-1)).toBe(false);
    expect(isValidPrefix(33)).toBe(false);
    expect(isValidPrefix(1.5)).toBe(false);
  });
});

describe("isContiguousMask", () => {
  it("accepte 0", () => {
    expect(isContiguousMask(0)).toBe(true);
  });
  it("accepte 0xFFFFFFFF", () => {
    expect(isContiguousMask(0xffffffff)).toBe(true);
  });
  it("accepte 0xFFFFFF00 (/24)", () => {
    expect(isContiguousMask(0xffffff00)).toBe(true);
  });
  it("accepte 0xFFFFFFE0 (/27)", () => {
    expect(isContiguousMask(0xffffffe0)).toBe(true);
  });
  it("refuse 0x0F0F0F0F (non contigu)", () => {
    expect(isContiguousMask(0x0f0f0f0f)).toBe(false);
  });
  it("refuse 0xFF00FF00 (non contigu)", () => {
    expect(isContiguousMask(0xff00ff00)).toBe(false);
  });
});

describe("isValidMask", () => {
  it.each(["/24", "24", "0", "32", "/0", "/32", "255.255.255.0", "255.255.255.224", "0.0.0.0", "255.255.255.255"])(
    "accepte %s",
    (input) => {
      expect(isValidMask(input)).toBe(true);
    },
  );
  it.each(["/33", "-1", "255.255.0.255", "abc", ""])(
    "refuse %s",
    (input) => {
      expect(isValidMask(input)).toBe(false);
    },
  );
});

describe("isValidCIDR", () => {
  it("accepte 192.168.1.0/24", () => {
    expect(isValidCIDR("192.168.1.0/24")).toBe(true);
  });
  it("refuse sans slash", () => {
    expect(isValidCIDR("192.168.1.0")).toBe(false);
  });
  it("refuse préfixe trop grand", () => {
    expect(isValidCIDR("192.168.1.0/33")).toBe(false);
  });
});
