import { describe, expect, it } from 'vitest';
import { calcularPrecios, inflarPerfume } from './precios';

function formulaVieja(p: { pc: number; tam: number; ce: number; margin: number; disc5: number; disc10: number; roundTo: number | null }) {
  const cml = p.pc / p.tam;
  return ([[2.5, 0], [5, p.disc5], [10, p.disc10]] as [number, number][]).map(([ml, d]) => {
    const ct = cml * ml + p.ce;
    const v = (ct * (1 + p.margin / 100) / ml) * (1 - d / 100) * ml;
    return p.roundTo ? Math.ceil(v / p.roundTo) * p.roundTo : Math.round(v);
  });
}

describe('calcularPrecios', () => {
  it('Paradise Garden saneado da 9.900 / 16.700 / 28.600', () => {
    const r = calcularPrecios({ pc: 120000, aj: 1.074699, tam: 75, ce: 645, margin: 100, disc5: 10, disc10: 20, roundTo: 100 });
    expect(r.map((x) => x.precio)).toEqual([9900, 16700, 28600]);
  });

  it('coincide con la fórmula de la app vieja en 20.000 combinaciones', () => {
    let seed = 7;
    const rnd = (a: number, b: number) => { seed = (seed * 16807) % 2147483647; return a + (seed % (b - a + 1)); };
    for (let i = 0; i < 20000; i++) {
      const p = { pc: rnd(1, 600) * 1000, tam: [30, 50, 55, 60, 75, 100, 125, 200][rnd(0, 7)], ce: rnd(0, 20) * 100, margin: rnd(10, 300), disc5: rnd(0, 30), disc10: rnd(0, 40), roundTo: [null, 100, 500, 1000][rnd(0, 3)] };
      expect(calcularPrecios({ ...p, aj: 1 }).map((x) => x.precio)).toEqual(formulaVieja(p));
    }
  });
});

describe('inflarPerfume', () => {
  const base = { pc: 100000, aj: 1, tam: 100, ce: 1000, margin: 60, disc5: 10, disc10: 20, roundTo: null, pl: 0, p25: 5600, p5: 8640, p10: 14080 };
  it('sube exactamente el % sin tocar el precio de compra', () => {
    const r = inflarPerfume(base, 1.1, 1000, null);
    expect([r.p25, r.p5, r.p10]).toEqual([6160, 9504, 15488]);
    expect(r.ajuste).toBe(1.1);
    expect(r.extra_cost).toBe(1100);
  });
  it('respeta precios cargados a mano', () => {
    const r = inflarPerfume({ ...base, p10: 9000 }, 1.1, 1000, null);
    expect(r.p10).toBe(9900);
  });
  it('aplica el costo fijo nuevo a quien usaba el general', () => {
    expect(inflarPerfume(base, 1.1, 1000, 1200).extra_cost).toBe(1200);
    expect(inflarPerfume({ ...base, ce: 700 }, 1.1, 1000, 1200).extra_cost).toBe(770);
  });
});
