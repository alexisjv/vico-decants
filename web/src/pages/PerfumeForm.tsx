import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react';
import { borrarPerfume, guardarPerfume, siguienteId, subirImagen, type Perfume, type Tipo } from '../lib/api';
import { calcularPrecios, pesos } from '../lib/precios';
import { useDatos } from '../lib/store';
import { Boton, Campo, Chip, FotoPerfume, Hoja, Seccion } from '../components/ui';

const vacio = (ce: number): Perfume => ({
  id: 0, tipo: '', marca: '', nombre: '', img: '', inspo: '', link: '', stock: true, p25: 0, p5: 0, p10: 0,
  pl: 0, pc: 0, tam: 100, ce, aj: 1, margin: 60, disc5: 10, disc10: 20, roundTo: null,
});

function Deslizador({ label, valor, min, max, onChange, signo = '' }: { label: string; valor: number; min: number; max: number; onChange: (v: number) => void; signo?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex justify-between text-[14px]"><span className="text-niebla">{label}</span><strong>{signo}{valor}%</strong></span>
      <input type="range" min={Math.min(min, Math.floor(valor))} max={Math.max(max, Math.ceil(valor))} step={Number.isInteger(valor) ? 1 : 0.1} value={valor}
        onChange={(e) => onChange(+e.target.value)} className="h-6 w-full cursor-pointer" />
    </label>
  );
}

function Foto({ titulo, src, archivo, onElegir }: { titulo: string; src: string; archivo: File | null; onElegir: (f: File) => void }) {
  const vista = useMemo(() => (archivo ? URL.createObjectURL(archivo) : src), [archivo, src]);
  return (
    <label className="group flex cursor-pointer flex-col gap-1.5">
      <span className="text-[13px] font-medium text-niebla">{titulo}</span>
      <div className="relative">
        <FotoPerfume src={vista} alt={titulo} className="h-36 w-full rounded-xl border border-borde-2" />
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-tinta/85 px-2.5 py-1 text-[12px] font-medium text-papel"><ImagePlus size={14} aria-hidden="true" />{vista ? 'Cambiar' : 'Subir'}</span>
      </div>
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onElegir(e.target.files[0])} />
    </label>
  );
}

export default function PerfumeForm() {
  const { id } = useParams();
  const editando = !!id;
  const { perfumes, config, setPerfumes, avisar } = useDatos();
  const navegar = useNavigate();
  const original = perfumes.find((p) => p.id === Number(id));
  const [p, setP] = useState<Perfume>(() => original ?? vacio(config.costoFijo));
  const [fotos, setFotos] = useState<{ m: File | null; i: File | null }>({ m: null, i: null });
  const [guardando, setGuardando] = useState(false);
  const [borrar, setBorrar] = useState(false);

  useEffect(() => {
    if (original) setP(original);
    else if (!editando) { setP(vacio(config.costoFijo)); siguienteId().then((n) => setP((x) => ({ ...x, id: n }))).catch(() => {}); }
  }, [original, editando, config.costoFijo]);

  const set = <K extends keyof Perfume>(k: K, v: Perfume[K]) => setP((x) => ({ ...x, [k]: v }));
  const setPc = (v: number) => setP((x) => ({ ...x, pc: v, aj: original && v === original.pc ? original.aj : 1 }));
  const precios = useMemo(() => (p.pc > 0 ? calcularPrecios(p) : null), [p]);

  async function guardar() {
    if (!p.nombre.trim()) { avisar('Falta el nombre del perfume', 'error'); return; }
    if (!precios) { avisar('Cargá el precio de compra para calcular los precios', 'error'); return; }
    setGuardando(true);
    try {
      const cod = String(p.id).padStart(5, '0');
      const img = fotos.m ? await subirImagen(fotos.m, cod, 'm') : p.img;
      const inspo = fotos.i ? await subirImagen(fotos.i, cod, 'i') : p.inspo;
      const [a, b, c] = precios.map((x) => x.precio);
      const guardado = await guardarPerfume({ ...p, nombre: p.nombre.trim(), marca: p.marca.trim(), img, inspo, p25: a, p5: b, p10: c });
      setPerfumes((l) => (l.some((x) => x.id === guardado.id) ? l.map((x) => (x.id === guardado.id ? guardado : x)) : [...l, guardado]));
      avisar(editando ? 'Perfume actualizado' : 'Perfume guardado');
      navegar('/');
    } catch (e) {
      avisar((e as Error).message, 'error');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarBorrar() {
    try {
      await borrarPerfume(p.id);
      setPerfumes((l) => l.filter((x) => x.id !== p.id));
      avisar('Perfume eliminado');
      navegar('/');
    } catch (e) {
      avisar((e as Error).message, 'error');
      setBorrar(false);
    }
  }

  if (editando && !original) return <p className="py-10 text-center text-niebla">Cargando perfume…</p>;

  return (
    <div className="pb-24 lg:pb-0">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => navegar(-1)} aria-label="Volver" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-crema-2"><ArrowLeft size={22} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-niebla">{editando ? `Editando · #${String(p.id).padStart(5, '0')}` : `Nuevo perfume · #${String(p.id || '').padStart(5, '0')}`}</p>
          <h1 className="truncate font-serif text-2xl font-semibold">{p.nombre || 'Sin nombre'}</h1>
        </div>
        {editando && <button onClick={() => setBorrar(true)} aria-label="Eliminar perfume" className="flex h-11 w-11 items-center justify-center rounded-full text-mal hover:bg-mal-bg"><Trash2 size={20} /></button>}
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="flex flex-col gap-4">
          <Seccion titulo="Datos">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Nombre" value={p.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Paradise Garden" />
              <Campo label="Marca" value={p.marca} onChange={(e) => set('marca', e.target.value)} placeholder="Ej: Jean Paul Gaultier" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Tipo">
              {(['Nicho', 'Diseñador', 'Arabe'] as Tipo[]).map((t) => <Chip key={t} activo={p.tipo === t} onClick={() => set('tipo', p.tipo === t ? '' : t)}>{t === 'Arabe' ? 'Árabe' : t}</Chip>)}
              <span className="mx-1 w-px bg-borde" />
              <Chip activo={p.stock} onClick={() => set('stock', !p.stock)}>{p.stock ? 'En stock' : 'Sin stock'}</Chip>
            </div>
            <Campo className="mt-3" label="Link de info (Fragrantica, etc.)" type="url" value={p.link} onChange={(e) => set('link', e.target.value)} placeholder="https://" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Foto titulo="Foto del perfume" src={p.img} archivo={fotos.m} onElegir={(f) => setFotos((x) => ({ ...x, m: f }))} />
              <Foto titulo="Inspirado en (opcional)" src={p.inspo} archivo={fotos.i} onElegir={(f) => setFotos((x) => ({ ...x, i: f }))} />
            </div>
          </Seccion>

          <Seccion titulo="Costos">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Precio de compra" inputMode="numeric" prefijo="$" value={p.pc || ''} onChange={(e) => setPc(+e.target.value || 0)} />
              <Campo label="Tamaño del frasco" inputMode="numeric" sufijo="ml" value={p.tam || ''} onChange={(e) => set('tam', +e.target.value || 0)} />
              <Campo label="Envase / atomizador" inputMode="numeric" prefijo="$" value={p.ce || ''} onChange={(e) => set('ce', +e.target.value || 0)} />
              <Campo label="Precio de lista (referencia)" inputMode="numeric" prefijo="$" value={p.pl || ''} onChange={(e) => set('pl', +e.target.value || 0)} />
            </div>
            {p.aj !== 1 && p.pc > 0 && (
              <p className="mt-3 rounded-xl bg-crema px-3 py-2 text-[13px] leading-snug text-niebla">
                Inflación acumulada <strong className="text-tinta">+{((p.aj - 1) * 100).toFixed(1).replace('.', ',')}%</strong> → costo actualizado <strong className="text-tinta">{pesos(p.pc * p.aj)}</strong>. Si cargás un precio de compra nuevo, se reinicia.
              </p>
            )}
          </Seccion>

          <Seccion titulo="Ganancia">
            <div className="flex flex-col gap-4">
              <Deslizador label="Margen (2,5 ml)" valor={p.margin} min={10} max={500} onChange={(v) => set('margin', v)} />
              <Deslizador label="Descuento por ml en 5 ml" valor={p.disc5} min={0} max={30} signo="−" onChange={(v) => set('disc5', v)} />
              <Deslizador label="Descuento por ml en 10 ml" valor={p.disc10} min={0} max={40} signo="−" onChange={(v) => set('disc10', v)} />
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Redondeo">
                <span className="mr-1 text-[14px] text-niebla">Redondear</span>
                {[null, 100, 500, 1000].map((r) => <Chip key={String(r)} activo={p.roundTo === r} onClick={() => set('roundTo', r)}>{r ? `al ${r}` : 'No'}</Chip>)}
                {p.roundTo && ![100, 500, 1000].includes(p.roundTo) && <Chip activo>al {p.roundTo}</Chip>}
              </div>
            </div>
          </Seccion>
        </div>

        <aside className="lg:sticky lg:top-8">
          <div className="rounded-xl2 bg-tinta p-4 text-papel">
            <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.1em] text-[#BDB4A6]">Precios de venta</p>
            {precios ? (
              <div className="flex flex-col divide-y divide-white/10">
                {precios.map((x) => (
                  <div key={x.ml} className="flex items-center justify-between py-2.5">
                    <div>
                      <div className="text-[13px] text-[#BDB4A6]">{String(x.ml).replace('.', ',')} ml{x.descuento ? ` · −${x.descuento}%` : ''}</div>
                      <div className="text-[12px] text-ok-claro">Ganás {pesos(x.ganancia)} · costo {pesos(x.costo)}</div>
                    </div>
                    <div className="font-serif text-[26px] font-semibold">{pesos(x.precio)}</div>
                  </div>
                ))}
                {p.pl > 0 && (
                  <div className="pt-2.5 text-[12px] text-[#BDB4A6]">
                    Vendiendo todo en 10 ml: {pesos(precios[2].precio * (p.tam / 10))} ({Math.round((precios[2].precio * (p.tam / 10) / p.pl) * 100)}% del precio de lista)
                  </div>
                )}
              </div>
            ) : (
              <p className="py-6 text-center text-[14px] text-[#BDB4A6]">Cargá el precio de compra para ver los precios.</p>
            )}
          </div>
          <div className="mt-4 hidden gap-3 lg:flex">
            <Boton variante="secundario" onClick={() => navegar('/')} className="flex-1">Cancelar</Boton>
            <Boton onClick={guardar} disabled={guardando} className="flex-[2]">{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar perfume'}</Boton>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-16 z-30 flex gap-3 border-t border-borde bg-papel/95 px-4 py-3 backdrop-blur lg:hidden">
        <Boton variante="secundario" onClick={() => navegar('/')} className="flex-1">Cancelar</Boton>
        <Boton onClick={guardar} disabled={guardando} className="flex-[2]">{guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar perfume'}</Boton>
      </div>

      <Hoja abierta={borrar} onCerrar={() => setBorrar(false)} titulo="Eliminar perfume"
        pie={<><Boton variante="secundario" onClick={() => setBorrar(false)} className="flex-1">Cancelar</Boton><Boton variante="peligro" onClick={confirmarBorrar} className="flex-1">Eliminar</Boton></>}>
        <p className="text-[15px]">¿Eliminar <strong>{p.nombre}</strong>? Si tiene pedidos no se puede borrar: en ese caso marcalo "sin stock".</p>
      </Hoja>
    </div>
  );
}
