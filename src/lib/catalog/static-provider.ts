import staticCatalog from "./static-catalog.json";
import type { CatalogProvider, StaticCatalogData } from "./types";

/** Repli sans réseau : lit un catalogue statique (vide tant qu'aucun abaque vérifié n'est chargé). */
export function createStaticProvider(
  data: StaticCatalogData = staticCatalog as unknown as StaticCatalogData,
): CatalogProvider {
  const trier = <T>(l: T[], cle: (x: T) => string) => [...l].sort((a, b) => cle(a).localeCompare(cle(b), "fr"));
  return {
    kind: "statique",
    async listTypes() {
      return trier(data.types, (t) => t.label);
    },
    async listManufacturers(typeId) {
      const ids = new Set(data.machines.filter((m) => m.typeId === typeId).map((m) => m.manufacturerId));
      return trier(
        data.manufacturers.filter((c) => ids.has(c.id)),
        (c) => c.name,
      );
    },
    async listModels(typeId, manufacturerId) {
      return trier(
        data.machines.filter((m) => m.typeId === typeId && m.manufacturerId === manufacturerId),
        (m) => m.model,
      );
    },
    async listConfigurations(machineId) {
      return trier(
        data.configurations.filter((c) => c.machineId === machineId),
        (c) => c.label,
      );
    },
    async getChart(configurationId) {
      const c = data.charts.find((x) => x.configurationId === configurationId);
      if (!c) return null;
      const { configurationId: _omit, ...chart } = c;
      void _omit;
      return chart;
    },
  };
}
