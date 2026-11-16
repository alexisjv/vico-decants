import { useMemo } from 'react';
import { Download, ExternalLink, LogOut } from 'lucide-react';
import { descargarBackup, supabase } from '../lib/api';
import { pesos } from '../lib/precios';
import { useDatos } from '../lib/store';
import { Boton, Encabezado, Seccion, Vacio } from '../components/ui';

export default function Panel() {
  const { pedidos, items, perfumes, avisar } = useDatos();

  const datos = useMemo(() => {
    const hechos = pedidos.filter((p) => p.estado === 'terminado');
    const pend = pedidos.filter((p) => p.estado === 'pendiente');
    const venta = hechos.reduce((s, p) => s + (p.total_venta || 0), 0);
    const costo = hechos.reduce((s, p) => s + (p.total_costo || 0), 0);
    const ahora = new Date();
    const meses = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - 5 + i, 1);
      const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { clave, etiqueta: d.toLocaleDateString('es-AR', { month: 'short' }), total: hechos.filter((p) => p.fecha?.startsWith(clave)).reduce((s, p) => s + p.total_venta, 0) };
    });
    const ids = new Set(hechos.map((p) => p.id));
    const top = new Map<string, { qty: number; ml: Record<string, number> }>();
    items.filter((i) => i.pedido_id && ids.has(i.pedido_id)).forEach((i) => {
      const t = top.get(i.perfume_nombre) || { qty: 0, ml: {} };
      t.qty += i.qty;
      t.ml[String(i.ml)] = (t.ml[String(i.ml)] || 0) + i.qty;
      top.set(i.perfume_nombre, t);
    });
    return {
      venta, ganancia: venta - costo, hechos: hechos.length, pend: pend.length, pendMonto: pend.reduce((s, p) => s + p.total_venta, 0),
      meses, max: Math.max(1, ...meses.map((m) => m.total)),
      top: [...top.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5),
    };
  }, [pedidos, items]);

  async function backup() {
    try { await descargarBackup(); avisar('Backup descargado'); } catch (e) { avisar((e as Error).message, 'error'); }
  }

  return (
    <>
      <Encabezado sobre="Panel" titulo={new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())}>
        <Boton variante="secundario" onClick={backup}><Download size={17} aria-hidden="true" />Backup</Boton>
      </Encabezado>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-xl2 bg-tinta p-5 text-papel lg:col-span-1">
          <p className="text-[13px] text-[#BDB4A6]">Ventas cobradas</p>
          <p className="font-serif text-[38px] font-semibold leading-tight">{pesos(datos.venta)}</p>
          <p className="text-[14px] text-ok-claro">Ganancia {pesos(datos.ganancia)}{datos.venta ? ` · ${Math.round((datos.ganancia / datos.venta) * 100)}% de la venta` : ''}</p>
        </section>
        <div className="grid grid-cols-3 gap-3 lg:col-span-2">
          {[['Pedidos terminados', datos.hechos, ''], ['Pendientes', datos.pend, datos.pend ? `${pesos(datos.pendMonto)} a cobrar` : 'Todo al día'], ['Perfumes en stock', perfumes.filter((p) => p.stock).length, `de ${perfumes.length}`]].map(([l, v, s]) => (
            <div key={String(l)} className="rounded-xl2 border border-borde bg-papel p-4">
              <p className="text-[12px] text-niebla">{l}</p>
              <p className="text-[28px] font-bold leading-tight">{v}</p>
              <p className="text-[12px] text-niebla">{s}</p>
            </div>
          ))}
        </div>

        <Seccion titulo="Ventas por mes" className="lg:col-span-2">
          <div role="img" aria-label={`Ventas de los últimos 6 meses: ${datos.meses.map((m) => `${m.etiqueta} ${pesos(m.total)}`).join(', ')}`} className="grid h-44 grid-cols-6 items-end gap-3">
            {datos.meses.map((m, i) => (
              <div key={m.clave} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className="text-[11px] text-niebla">{m.total ? pesos(m.total / 1000).replace('$', '$') + 'k' : ''}</span>
                <div className={`w-full rounded-lg ${i === 5 ? 'bg-oro' : 'bg-borde-2'}`} style={{ height: `${Math.max(3, (m.total / datos.max) * 100)}%` }} />
                <span className="text-[12px] capitalize text-niebla">{m.etiqueta.replace('.', '')}</span>
              </div>
            ))}
          </div>
        </Seccion>

        <Seccion titulo="Más vendidos">
          {datos.top.length ? (
            <ol className="flex flex-col divide-y divide-borde">
              {datos.top.map(([nombre, t], i) => (
                <li key={nombre} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-crema text-[13px] font-bold">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-serif text-[16px] font-semibold">{nombre}</span>
                  <span className="text-[13px] text-niebla">{t.qty} u.</span>
                </li>
              ))}
            </ol>
          ) : <Vacio titulo="Sin ventas todavía" />}
        </Seccion>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 lg:hidden">
        <a href="../" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde-2 bg-papel px-4 text-[15px] font-semibold"><ExternalLink size={17} aria-hidden="true" />Versión clásica</a>
        <Boton variante="secundario" onClick={() => supabase.auth.signOut()}><LogOut size={17} aria-hidden="true" />Salir</Boton>
      </div>
    </>
  );
}
