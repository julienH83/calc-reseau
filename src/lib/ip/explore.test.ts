import { exploreSubdivisions } from "./explore";

describe("exploreSubdivisions", () => {
  it("/24 → 2,4,8,...,64 sous-réseaux (s'arrête avant /31)", () => {
    const rows = exploreSubdivisions(24);
    expect(rows.map((r) => r.count)).toEqual([2, 4, 8, 16, 32, 64]);
    expect(rows.map((r) => r.newPrefix)).toEqual([25, 26, 27, 28, 29, 30]);
    expect(rows.map((r) => r.hostsPerSubnet)).toEqual([126, 62, 30, 14, 6, 2]);
  });

  it("/30 → tableau vide (déjà au minimum utilisable)", () => {
    const rows = exploreSubdivisions(30);
    expect(rows).toEqual([]);
  });

  it("/16 → première ligne en /17 avec 32766 hôtes", () => {
    const rows = exploreSubdivisions(16);
    expect(rows[0]?.count).toBe(2);
    expect(rows[0]?.newPrefix).toBe(17);
    expect(rows[0]?.hostsPerSubnet).toBe(32766);
  });

  it("respecte minHosts", () => {
    // /25=126, /26=62, /27=30 (≥30 → ok), /28=14 (<30 → stop)
    const rows = exploreSubdivisions(24, 30);
    expect(rows.map((r) => r.count)).toEqual([2, 4, 8]);
    expect(rows[rows.length - 1]?.hostsPerSubnet).toBeGreaterThanOrEqual(30);
  });
});
