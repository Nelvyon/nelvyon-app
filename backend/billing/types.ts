export interface PremiumProduct {
  name: string;
  /** Amount in minor units (cents) for display. */
  amount: number;
  /**
   * El precio NO es definitivo: es una referencia para que la interfaz pueda
   * pintar algo mientras Daniel decide el real.
   *
   * Existe porque la alternativa era peor: poner una cifra plausible sin marca
   * la convierte en la cifra real el dia que alguien la copia a una propuesta,
   * y para entonces nadie recuerda que se puso a ojo.
   *
   * Un servicio con esto en `true` NO se puede facturar. Lo impide
   * `precioFacturable()` y lo vigila una prueba.
   */
  precioPendiente?: boolean;
}
