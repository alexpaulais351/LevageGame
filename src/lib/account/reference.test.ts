import { describe, expect, it } from "vitest";

import { prochaineReference } from "./reference";

describe("références d'études", () => {
  it("démarre à ADQ-001", () => {
    expect(prochaineReference([])).toBe("ADQ-001");
    expect(prochaineReference([null, "libre"])).toBe("ADQ-001");
  });
  it("prend le plus grand suffixe + 1 (sans réutiliser un trou)", () => {
    expect(prochaineReference(["ADQ-001", "ADQ-004", "ADQ-002"])).toBe("ADQ-005");
    expect(prochaineReference(["ADQ-999"])).toBe("ADQ-1000");
  });
  it("ignore les références d'un autre format", () => {
    expect(prochaineReference(["XYZ-010", "ADQ-2b"])).toBe("ADQ-001");
  });
});
