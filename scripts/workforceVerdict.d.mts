/**
 * Tipos de `workforceVerdict.mjs`, que es JavaScript y lo consume TypeScript.
 *
 * Sin este fichero, la prueba que lo comprueba no compilaba: seis errores
 * TS7016 («no se encuentra una declaracion para este modulo»). La alternativa
 * era `allowJs` —que arrastraria al programa todos los scripts del repositorio—
 * o un `@ts-ignore`, que habria dejado la prueba sin comprobar tipos ninguno.
 *
 * Se declara lo que el modulo exporta DE VERDAD. Si cambia alli y no aqui, la
 * prueba deja de compilar, que es exactamente lo que tiene que pasar.
 */

/** Los pasos cuya evidencia en vivo no se puede sustituir por una declaracion. */
export declare const LIVE_EVIDENCE_STEP_IDS: readonly string[];

/** Motivo de bloqueo: se pidio certificar sin evidencia real. */
export declare const LIVE_EVIDENCE_MISSING_BLOCKER: string;

/** Motivo de bloqueo: se intento forzar el aprobado. */
export declare const FORCE_PASS_BLOCKER: string;

export type PasoDeWorkforce = {
  id: string;
  required?: boolean;
  ok?: boolean;
  detail?: string;
  /** Por que se omitio. Solo lo traen los pasos de `skipped`. */
  reason?: string;
};

export type VeredictoDeWorkforce = {
  verdict: string;
  /** Solo puede ser cierto con evidencia en vivo real. */
  certified: boolean;
  rationale: string;
  blockers: string[];
  requiredOk: boolean;
  liveEvidenceOk: boolean;
  internalBlockers: string[];
  exitCode: number;
};

export declare function decideWorkforceVerdict(entrada: {
  steps?: PasoDeWorkforce[];
  skipped?: PasoDeWorkforce[];
  forcePass?: boolean;
}): VeredictoDeWorkforce;
