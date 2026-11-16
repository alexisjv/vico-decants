import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Search, Trash2, X } from 'lucide-react';
import { borrarPedido, getItems, guardarPedido, hoy, type Pedido, type Perfume } from '../lib/api';
import { costoReal, pesos } from '../lib/precios';
import { useDatos } from '../lib/store';
import { Boton, Campo, FotoPerfume, Hoja, Seccion } from '../components/ui';
import { abrirWhatsApp } from './Pedidos';

interface Linea { key: number; perfumeId: number; nombre: string; ml: number; qty: number; precio: number | null; costo: number | null }
const TAMANOS = [2.5, 5, 10];
let siguiente = 1;

export default function PedidoForm() {
  const { id } = useParams();
  const editando = !!id;
  const { perfumes, pedidos, recargar, avisar } = useDatos();
  const navegar = useNavigate();
  const original = pedidos.find((p) => p.id === Number(id));
  const [cliente, setCliente] = useState({ cliente_nombre: '', cliente_tel: '', cliente_email: '', cliente_dir: '', notas: '', fecha: hoy() });
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [buscar, setBuscar] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [borrar, setBorrar] = useState(false);

  useEffect(() => {
    if (!original) return;
    setCliente({ cliente_nombre: original.cliente_nombre || '', cliente_tel: original.cliente_tel || '', cliente_email: original.cliente_email || '', cliente_dir: original.cliente_dir || '', notas: original.notas || '', fecha: original.fecha || hoy() });
    getItems(original.id).then((its) => setLineas(its.map((i) => ({ key: siguiente++, perfumeId: i.perfume_id, nombre: i.perfume_nombre, ml: +i.ml, qty: i.qty, precio: i.precio_unit, costo: i.costo_unit }))))
      .catch((e) => avisar(e.message, 'error'));
  }, [original, avisar]);

  const clientes = useMemo(() => {
    const m = new Map<string, Partial<Pedido>>();
    pedidos.forEach((p) => {
      const n = (p.cliente_nombre || '').trim();
      if (!n) return;
      const c = m.get(n.toLowerCase()) || { cliente_nombre: n };
      (['cliente_tel', 'cliente_email', 'cliente_dir'] as const).forEach((k) => { if (!c[k] && p[k]) c[k] = p[k]; });
      m.set(n.toLowerCase(), c);
    });
    return m;
  }, [pedidos]);

  function elegirCliente(nombre: string) {
    const c = clientes.get(nombre.trim().toLowerCase());
    setCliente((x) => ({ ...x, cliente_nombre: nombre, ...(c ? { cliente_tel: x.cliente_tel || c.cliente_tel || '', cliente_email: x.cliente_email || c.cliente_email || '', cliente_dir: x.cliente_dir || c.cliente_dir || '' } : {}) }));
  }

  const perfumePorId = (pid: number) => perfumes.find((p) => p.id === pid);
  const precioDe = (l: Linea) => l.precio ?? (() => { const p = perfumePorId(l.perfumeId); return p ? ({ 2.5: p.p25, 5: p.p5, 10: p.p10 } as Record<number, number>)[l.ml] || 0 : 0; })();
  const costoDe = (l: Linea) => l.costo ?? (() => { const p = perfumePorId(l.perfumeId); return p ? costoReal(p, l.ml) : 0; })();
  const total = lineas.reduce((s, l) => s + precioDe(l) * l.qty, 0);
  const costo = lineas.reduce((s, l) => s + costoDe(l) * l.qty, 0);
  const unidades = lineas.reduce((s, l) => s + l.qty, 0);

  const resultados = useMemo(() => {
    const t = buscar.trim().toLowerCase();
    return t ? perfumes.filter((p) => p.stock && `${p.nombre} ${p.marca}`.toLowerCase().includes(t)).slice(0, 6) : [];
  }, [buscar, perfumes]);

  const agregar = (p: Perfume) => { setLineas((l) => [...l, { key: siguiente++, perfumeId: p.id, nombre: p.nombre, ml: 2.5, qty: 1, precio: null, costo: null }]); setBuscar(''); };
  const cambiar = (key: number, cambios: Partial<Linea>) => setLineas((l) => l.map((x) => (x.key === key ? { ...x, ...cambios } : x)));

  async function guardar() {
    if (!lineas.length) { avisar('Agregá al menos un perfume', 'error'); return; }
    setGuardando(true);
    try {
      const items = lineas.map((l) => ({ perfume_id: l.perfumeId, perfume_nombre: l.nombre, ml: l.ml, qty: l.qty, precio_unit: precioDe(l), costo_unit: Math.round(costoDe(l)) }));
      const datos = { ...cliente, cliente_nombre: cliente.cliente_nombre.trim(), total_venta: Math.round(total), total_costo: Math.round(costo) };
      const pid = await guardarPedido(datos, items, original?.id);
      await recargar();
      avisar(editando ? 'Pedido actualizado' : `Pedido #${String(pid).padStart(5, '0')} guardado`);
      navegar('/pedidos');
    } catch (e) {
      avisar((e as Error).message, 'error');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarBorrar() {
    if (!original) return;
    try { await borrarPedido(original.id); await recargar(); avisar('Pedido eliminado'); navegar('/pedidos'); }
    catch (e) { avisar((e as Error).message, 'error'); }
  }

  const c = (k: keyof typeof cliente) => ({ value: cliente[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCliente((x) => ({ ...x, [k]: e.target.value })) });

  return (
    <div className="pb-40 lg:pb-0">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => navegar('/pedidos')} aria-label="Volver" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-crema-2"><ArrowLeft size={22} /></button>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-niebla">{editando ? `Pedido #${String(id).padStart(5, '0')}` : 'Pedidos'}</p>
          <h1 className="font-serif text-2xl font-semibold">{editando ? 'Editar pedido' : 'Nuevo pedido'}</h1>
        </div>
        {editando && <button onClick={() => setBorrar(true)} aria-label="Eliminar pedido" className="flex h-11 w-11 items-center justify-center rounded-full text-mal hover:bg-mal-bg"><Trash2 size={20} /></button>}
      </header>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px] xl:items-start">
        <div className="flex flex-col gap-4">
          <Seccion titulo="Perfumes">
            <label className="relative flex h-12 items-center gap-2.5 rounded-xl border border-borde-2 bg-white px-3.5 focus-within:border-tinta">
              <Search size={18} className="text-niebla" aria-hidden="true" />
              <span className="sr-only">Buscar perfume para agregar</span>
              <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar perfume en stock" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
            </label>
            {resultados.length > 0 && (
              <ul className="mt-2 overflow-hidden rounded-xl border border-borde bg-white">
                {resultados.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => agregar(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-crema">
                      <FotoPerfume src={p.img} alt="" className="h-10 w-10 rounded-lg" />
                      <span className="flex-1"><span className="block font-semibold">{p.nombre}</span><span className="text-[12px] text-niebla">{p.marca}</span></span>
                      <span className="text-[13px] text-niebla">desde {pesos(p.p25)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!lineas.length ? (
              <p className="py-6 text-center text-[14px] text-niebla">Buscá y agregá perfumes al pedido.</p>
            ) : (
              <ul className="mt-2 divide-y divide-borde">
                {lineas.map((l) => (
                  <li key={l.key} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1 basis-full sm:basis-40">
                      <div className="truncate font-serif text-[16px] font-semibold">{l.nombre}</div>
                      <div className="text-[12px] text-niebla">{pesos(precioDe(l))} c/u{l.precio != null && editando ? ' · precio cobrado' : ''}</div>
                    </div>
                    <div className="flex rounded-xl border border-borde-2 p-0.5" role="group" aria-label="Tamaño">
                      {TAMANOS.map((ml) => (
                        <button key={ml} onClick={() => cambiar(l.key, { ml, precio: null, costo: null })} aria-pressed={l.ml === ml}
                          className={`h-11 min-w-11 rounded-lg px-2.5 text-[13px] font-semibold ${l.ml === ml ? 'bg-tinta text-papel' : 'text-niebla'}`}>{String(ml).replace('.', ',')}</button>
                      ))}
                    </div>
                    <div className="flex items-center rounded-xl border border-borde-2">
                      <button onClick={() => (l.qty > 1 ? cambiar(l.key, { qty: l.qty - 1 }) : setLineas((x) => x.filter((y) => y.key !== l.key)))} aria-label={l.qty > 1 ? 'Restar uno' : 'Quitar'} className="flex h-11 w-11 items-center justify-center">{l.qty > 1 ? <Minus size={16} /> : <X size={16} />}</button>
                      <span className="w-7 text-center font-bold" aria-live="polite">{l.qty}</span>
                      <button onClick={() => cambiar(l.key, { qty: l.qty + 1 })} aria-label="Sumar uno" className="flex h-11 w-11 items-center justify-center"><Plus size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Seccion>

          <Seccion titulo="Cliente">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Campo label="Nombre" list="clientes" autoComplete="off" value={cliente.cliente_nombre} onChange={(e) => elegirCliente(e.target.value)} placeholder="Nombre y apellido" />
              <datalist id="clientes">{[...clientes.values()].map((x) => <option key={x.cliente_nombre} value={x.cliente_nombre} />)}</datalist>
              <Campo label="Teléfono" type="tel" {...c('cliente_tel')} placeholder="11 2345 6789" />
              <Campo label="Email" type="email" {...c('cliente_email')} />
              <Campo label="Dirección" {...c('cliente_dir')} />
              <Campo label="Fecha" type="date" {...c('fecha')} />
              <Campo label="Notas" {...c('notas')} placeholder="Observaciones" />
            </div>
          </Seccion>
        </div>

        <aside className="xl:sticky xl:top-8">
          <div className="rounded-xl2 bg-tinta p-4 text-papel">
            <div className="flex justify-between text-[13px] text-[#BDB4A6]"><span>{unidades} decant{unidades === 1 ? '' : 's'}</span><span>Total</span></div>
            <div className="text-right font-serif text-[34px] font-semibold leading-tight">{pesos(total)}</div>
            <div className="text-right text-[13px] text-ok-claro">Ganancia estimada {pesos(total - costo)}</div>
          </div>
          <div className="mt-4 hidden flex-col gap-3 lg:flex">
            <Boton onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar pedido'}</Boton>
            {original && <Boton variante="whatsapp" onClick={() => abrirWhatsApp(original).catch((e) => avisar(e.message, 'error'))}>Enviar por WhatsApp</Boton>}
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 flex gap-3 border-t border-borde bg-papel/95 px-4 py-3 backdrop-blur lg:hidden">
        {original && <Boton variante="whatsapp" onClick={() => abrirWhatsApp(original).catch((e) => avisar(e.message, 'error'))} className="flex-1">WhatsApp</Boton>}
        <Boton onClick={guardar} disabled={guardando} className="flex-[2]">{guardando ? 'Guardando…' : `Guardar · ${pesos(total)}`}</Boton>
      </div>

      <Hoja abierta={borrar} onCerrar={() => setBorrar(false)} titulo="Eliminar pedido"
        pie={<><Boton variante="secundario" onClick={() => setBorrar(false)} className="flex-1">Cancelar</Boton><Boton variante="peligro" onClick={confirmarBorrar} className="flex-1">Eliminar</Boton></>}>
        <p className="text-[15px]">¿Eliminar el pedido de <strong>{cliente.cliente_nombre || 'sin nombre'}</strong>? No se puede deshacer.</p>
      </Hoja>
    </div>
  );
}
