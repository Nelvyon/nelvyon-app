export interface EvalResult {
  score: number;
  breakdown: {
    especificidad: number;
    calidad_profesional: number;
    accionabilidad: number;
    originalidad: number;
    impacto_comercial: number;
  };
  feedback: string;
  passed: boolean;
  attempt: number;
}
