/** Moteur de calcul d'adéquation de levage — API publique (module pur TypeScript). */
export * from "./types";
export { EPS, G } from "./util";
export { HORS_ABAQUE, chartSourceLabel, readCapacity, validateChart } from "./chart";
export { kgToKN, kNToKg, totalLoad, type TotalLoadInput } from "./load";
export { hookHeight, type HookHeightInput } from "./hauteur";
export {
  ANGLE_MAX_DEG,
  ANGLE_RESERVE_DEG,
  brinsPorteurs,
  checkRigging,
  type Accessoire,
  type AccessoireCheck,
  type AccessoireType,
  type RiggingInput,
  type RiggingResult,
} from "./rigging";
export {
  checkCrawlerPressure,
  checkOutriggerPressure,
  minBearingCapacity,
  type CrawlerInput,
  type MinBearingInput,
  type GroundResult,
  type OutriggerInput,
  type SurfaceAppui,
} from "./ground";
export {
  checkPowerLine,
  checkWind,
  kmhToMs,
  type PowerLineInput,
  type PowerLineResult,
  type WindInput,
  type WindResult,
} from "./environment";
export {
  DEFAULT_THRESHOLDS,
  computeVerdict,
  validateThresholds,
  zoneOf,
  type LiftPosition,
  type PositionResult,
  type Thresholds,
  type VerdictGlobal,
  type VerdictInput,
  type VerdictResult,
  type Zone,
} from "./verdict";
