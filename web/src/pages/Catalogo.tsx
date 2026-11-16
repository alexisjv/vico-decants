import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileDown, Percent, Plus, Search } from 'lucide-react';
import { cambiarStock, type Perfume, type Tipo } from '../lib/api';
import { pesos } from '../lib/precios';
import { useDatos } from '../lib/store';
import { Boton, Chip, Encabezado, FotoPerfume, Vacio } from '../components/ui';
import Inflacion from './Inflacion';

const tipos: { v: Tipo | 'todos' | 'sin'; l: string }[] = [
  { v: 'todos', l: 'Todos' }, { v: 'Nicho', l: 'Nicho' }, { v: 'Diseñador', l: 'Diseñador' }, { v: 'Arabe', l: 'Árabe' }, { v: 'sin', l: 'Sin stock' },
];
const ordenes = { nombre: 'A → Z', barato: 'Precio ↑', caro: 'Precio ↓', vendidos: 'Más vendidos' } as const;
type Orden = keyof typeof ordenes;
const etiquetaTipo = (t: Tipo) => (t === 'Arabe' ? 'Árabe' : t);

export default function Catalogo() {
  const { perfumes, setPerfumes, avisar, ventas, cargando } = useDatos();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<(typeof tipos)[number]['v']>('todos');
  const [orden, setOrden] = useState<Orden>('nombre');
  const [inflacion, setInflacion] = useState(false);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const navegar = useNavigate();

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    const l = perfumes.filter((p) =>
      (filtro === 'todos' || (filtro === 'sin' ? !p.stock : p.tipo === filtro)) &&
      (!t || `${p.nombre} ${p.marca}`.toLowerCase().includes(t)));
    const cmp: Record<Orden, (a: Perfume, b: Perfume) => number> = {
      nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
      barato: (a, b) => a.p25 - b.p25,
      caro: (a, b) => b.p25 - a.p25,
      vendidos: (a, b) => (ventas.get(b.id) || 0) - (ventas.get(a.id) || 0),
    };
    return [...l].sort(cmp[orden]);
  }, [perfumes, q, filtro, orden, ventas]);

  const cuenta = (v: (typeof tipos)[number]['v']) =>
    v === 'todos' ? perfumes.length : v === 'sin' ? perfumes.filter((p) => !p.stock).length : perfumes.filter((p) => p.tipo === v).length;

  async function alternarStock(p: Perfume) {
    if (ocupado) return;
    setOcupado(p.id);
    try {
      await cambiarStock(p.id, !p.stock);
      setPerfumes((l) => l.map((x) => (x.id === p.id ? { ...x, stock: !p.stock } : x)));
      avisar(`${p.nombre}: ${!p.stock ? 'en stock' : 'sin stock'}`);
    } catch (e) {
      avisar((e as Error).message, 'error');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <>
      <Encabezado sobre="Vico Decants" titulo="Catálogo">
        <Boton variante="secundario" onClick={() => setInflacion(true)}><Percent size={17} aria-hidden="true" />Inflación</Boton>
        <a href="../" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-borde-2 bg-papel px-4 text-[15px] font-semibold hover:border-tinta">
          <FileDown size={17} aria-hidden="true" />PDF y folleto
        </a>
        <Link to="/perfume/nuevo" className="hidden min-h-11 items-center gap-2 rounded-xl bg-tinta px-4 text-[15px] font-semibold text-papel hover:bg-tinta-3 lg:inline-flex">
          <Plus size={17} aria-hidden="true" />Nuevo perfume
        </Link>
      </Encabezado>

      <div className="sticky top-0 z-30 -mx-4 bg-crema/95 px-4 pb-3 pt-1 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:px-0">
        <div className="flex flex-wrap gap-2">
          <label className="flex h-12 min-w-0 flex-1 basis-64 items-center gap-2.5 rounded-xl border border-borde-2 bg-papel px-3.5 focus-within:border-tinta">
            <Search size={18} className="text-niebla" aria-hidden="true" />
            <span className="sr-only">Buscar perfume</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o marca" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-niebla/70" />
          </label>
          <label className="flex h-12 items-center rounded-xl border border-borde-2 bg-papel px-3 text-[14px]">
            <span className="sr-only">Ordenar</span>
            <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className="bg-transparent outline-none">
              {Object.entries(ordenes).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        </div>
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {tipos.map((t) => <Chip key={t.v} activo={filtro === t.v} onClick={() => setFiltro(t.v)}>{t.l} · {cuenta(t.v)}</Chip>)}
        </div>
      </div>

      {cargando && !perfumes.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-36 animate-pulse rounded-xl2 bg-crema-2" />)}</div>
      ) : !lista.length ? (
        <Vacio titulo={perfumes.length ? 'Sin resultados' : 'Todavía no hay perfumes'} texto={perfumes.length ? 'Probá con otra búsqueda o filtro.' : 'Cargá el primero para armar tu catálogo.'}
          accion={!perfumes.length && <Boton onClick={() => navegar('/perfume/nuevo')}>Cargar perfume</Boton>} />
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => (
            <li key={p.id} className={`flex min-w-0 gap-3.5 rounded-xl2 border border-borde bg-papel p-3 transition-shadow hover:shadow-suave ${p.stock ? '' : 'opacity-75'}`}>
              <Link to={`/perfume/${p.id}`} className="shrink-0" aria-label={`Editar ${p.nombre}`}>
                <FotoPerfume src={p.img} alt={p.nombre} className={`h-28 w-[88px] rounded-xl ${p.stock ? '' : 'grayscale'}`} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/perfume/${p.id}`} className="min-w-0">
                    <h2 className="truncate font-serif text-[18px] font-semibold leading-tight">{p.nombre}</h2>
                    <p className="truncate text-[13px] text-niebla">{[p.marca, etiquetaTipo(p.tipo)].filter(Boolean).join(' · ')}</p>
                  </Link>
                  <button
                    onClick={() => alternarStock(p)}
                    disabled={ocupado === p.id}
                    aria-pressed={p.stock}
                    aria-label={`${p.nombre}: ${p.stock ? 'en stock' : 'sin stock'}. Tocá para cambiar`}
                    className={`h-8 shrink-0 rounded-full px-3 text-[11px] font-semibold uppercase tracking-wide ${p.stock ? 'bg-ok-bg text-ok' : 'bg-mal-bg text-mal'}`}
                  >
                    {p.stock ? 'En stock' : 'Sin stock'}
                  </button>
                </div>
                <div className="mt-auto grid grid-cols-3 gap-1.5">
                  {([['2,5 ml', p.p25], ['5 ml', p.p5], ['10 ml', p.p10]] as const).map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-crema px-2 py-1.5">
                      <div className="text-[11px] text-niebla">{l}</div>
                      <div className="text-[15px] font-bold">{pesos(v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link to="/perfume/nuevo" aria-label="Nuevo perfume" className="fixed bottom-24 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-tinta text-oro-claro shadow-fab lg:hidden">
        <Plus size={26} aria-hidden="true" />
      </Link>
      <Inflacion abierta={inflacion} onCerrar={() => setInflacion(false)} />
    </>
  );
}
