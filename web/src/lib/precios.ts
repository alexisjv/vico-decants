export type Ml = 2.5 | 5 | 10;

export interface DatosPrecio {
  pc: number;
  aj?: number;
  tam: number;
  ce: number;
  margin: number;
  disc5: number;
  disc10: number;
  roundTo?: number | null;
}

export interface PrecioTamano {
  ml: Ml;
  descuento: number;
  costo: number;
  precio: number;
  ganancia: number;
  porMl: number;
}

export function redondear(v: number, roundTo?: number | null): number {
  const t = Number(roundTo);
  return t > 0 ? Math.ceil(v / t) * t : Math.round(v);
}

export function calcularPrecios({ pc, aj, tam, ce, margin, disc5, disc10, roundTo }: DatosPrecio): PrecioTamano[] {
  const costoMl = ((Number(pc) || 0) * (Number(aj) || 1)) / (Number(tam) || 100);
  const mg = +margin || 0;
  const extra = +ce || 0;
  const tamanos: [Ml, number][] = [[2.5, 0], [5, +disc5 || 0], [10, +disc10 || 0]];
  return tamanos.map(([ml, d]) => {
    const costo = costoMl * ml + extra;
    const precio = redondear(((costo * (1 + mg / 100)) / ml) * (1 - d / 100) * ml, roundTo);
    return { ml, descuento: d, costo, precio, ganancia: precio - costo, porMl: precio / ml };
  });
}

export function costoReal(p: { pc: number; tam: number; ce: number }, ml: number): number {
  if (!p.pc || !p.tam) return 0;
  return (p.pc / p.tam) * ml + (p.ce || 0);
}

export function inflarPerfume<T extends DatosPrecio & { p25: number; p5: number; p10: number; pl: number }>(
  p: T,
  mult: number,
  costoFijoAnterior: number,
  costoFijoNuevo: number | null,
) {
  const ce0 = +p.ce || 0;
  const ce = costoFijoNuevo != null && Math.abs(ce0 - (+costoFijoAnterior || 0)) < 0.01 ? costoFijoNuevo : Math.round(ce0 * mult);
  const aj = Math.round((p.aj || 1) * mult * 1e6) / 1e6;
  const pl = p.pl ? Math.round(p.pl * mult) : 0;
  const actual = calcularPrecios(p).map((x) => x.precio);
  const coincide = !!p.pc && [p.p25, p.p5, p.p10].every((v, i) => Math.abs(v - actual[i]) <= 2);
  let precios: { p25: number; p5: number; p10: number };
  if (coincide) {
    const [a, b, c] = calcularPrecios({ ...p, aj, ce }).map((x) => x.precio);
    precios = { p25: a, p5: b, p10: c };
  } else {
    precios = { p25: Math.round(p.p25 * mult), p5: Math.round(p.p5 * mult), p10: Math.round(p.p10 * mult) };
  }
  return { ...precios, ajuste: aj, pl, extra_cost: ce };
}

export const pesos = (n: number) => '$' + Math.round(n || 0).toLocaleString('es-AR');
