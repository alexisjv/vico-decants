import { createClient } from '@supabase/supabase-js';
import { inflarPerfume } from './precios';

export const supabase = createClient(import.meta.env.VITE_SB_URL, import.meta.env.VITE_SB_KEY);

export type Tipo = 'Nicho' | 'Diseñador' | 'Arabe' | '';

export interface Perfume {
  id: number;
  tipo: Tipo;
  marca: string;
  nombre: string;
  img: string;
  inspo: string;
  link: string;
  stock: boolean;
  p25: number;
  p5: number;
  p10: number;
  pl: number;
  pc: number;
  tam: number;
  ce: number;
  aj: number;
  margin: number;
  disc5: number;
  disc10: number;
  roundTo: number | null;
}

export interface Pedido {
  id: number;
  fecha: string;
  cliente_nombre: string;
  cliente_tel: string;
  cliente_email: string;
  cliente_dir: string;
  notas: string;
  total_costo: number;
  total_venta: number;
  estado: 'pendiente' | 'terminado';
}

export interface PedidoItem {
  id?: number;
  pedido_id?: number;
  perfume_id: number;
  perfume_nombre: string;
  ml: number;
  qty: number;
  precio_unit: number;
  costo_unit: number;
}

export interface Config {
  costoFijo: number;
  inflacion: number;
  inflFecha: string;
}

type Row = Record<string, unknown>;
const num = (v: unknown, d = 0) => (v == null || v === '' ? d : Number(v));

function aPerfume(r: Row): Perfume {
  return {
    id: num(r.id), tipo: (r.type as Tipo) || '', marca: String(r.brand ?? ''), nombre: String(r.name ?? ''),
    img: String(r.img ?? ''), inspo: String(r.img_insp ?? ''), link: String(r.info ?? ''), stock: r.stock !== false,
    p25: num(r.p25), p5: num(r.p5), p10: num(r.p10), pl: num(r.pl), pc: num(r.pc), tam: num(r.size) || 100,
    ce: num(r.extra_cost), aj: num(r.ajuste, 1), margin: num(r.margin, 60), disc5: num(r.disc5, 10), disc10: num(r.disc10, 20),
    roundTo: r.round_to == null ? null : num(r.round_to),
  };
}

function aFila(p: Perfume): Row {
  return {
    id: p.id, type: p.tipo, brand: p.marca, name: p.nombre, img: p.img, img_insp: p.inspo, info: p.link, stock: p.stock,
    size: p.tam, margin: p.margin, disc5: p.disc5, disc10: p.disc10, round_to: p.roundTo, extra_cost: p.ce, ajuste: p.aj,
    pl: p.pl, pc: p.pc, p25: p.p25, p5: p.p5, p10: p.p10,
  };
}

function ok<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getPerfumes(): Promise<Perfume[]> {
  return ok(await supabase.from('Perfumes').select('*').order('id')).map(aPerfume);
}

export async function siguienteId(): Promise<number> {
  const rows = ok(await supabase.from('Perfumes').select('id').order('id', { ascending: false }).limit(1));
  return rows.length ? num(rows[0].id) + 1 : 1;
}

export async function guardarPerfume(p: Perfume): Promise<Perfume> {
  return aPerfume(ok(await supabase.from('Perfumes').upsert(aFila(p)).select().single()));
}

export async function cambiarStock(id: number, stock: boolean) {
  ok(await supabase.from('Perfumes').update({ stock }).eq('id', id));
}

export async function borrarPerfume(id: number) {
  const usados = ok(await supabase.from('PedidosItems').select('id').eq('perfume_id', id).limit(1));
  if (usados.length) throw new Error('Tiene pedidos: marcalo "sin stock" en lugar de borrarlo');
  ok(await supabase.from('Perfumes').delete().eq('id', id));
}

async function achicarImagen(file: File, max = 1200): Promise<Blob> {
  if (!/^image\/(png|jpeg)$/.test(file.type) || file.size < 300 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const b = await new Promise<Blob | null>((r) => c.toBlob(r, file.type, 0.85));
    return b && b.size < file.size ? b : file;
  } catch (e) {
    console.warn('Imagen:', e);
    return file;
  }
}

export async function subirImagen(file: File, codigo: string, slot: 'm' | 'i'): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `${codigo}_${slot}.${ext}`;
  ok(await supabase.storage.from('Imagenes').upload(path, await achicarImagen(file), { upsert: true, contentType: file.type }));
  return `${supabase.storage.from('Imagenes').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
}

export async function getConfig(): Promise<Config> {
  const rows = ok(await supabase.from('Configuracion').select('descripcion,valor,fecha_modificacion'));
  const v = (d: string) => rows.find((r) => r.descripcion === d);
  return {
    costoFijo: num(v('costo_fijo')?.valor),
    inflacion: num(v('inflacion')?.valor),
    inflFecha: String(v('inflacion')?.fecha_modificacion ?? ''),
  };
}

async function setConfig(descripcion: string, valor: number) {
  const fecha_modificacion = new Date().toISOString();
  const upd = ok(await supabase.from('Configuracion').update({ valor: String(valor), fecha_modificacion }).eq('descripcion', descripcion).select());
  if (!upd.length) ok(await supabase.from('Configuracion').insert({ descripcion, valor: String(valor), fecha_modificacion }));
}

export async function aplicarInflacion(perfumes: Perfume[], pct: number, costoFijoAnterior: number, costoFijoEscrito: number | null) {
  const mult = 1 + pct / 100;
  const cfNuevo = costoFijoEscrito != null && Math.abs(costoFijoEscrito - costoFijoAnterior) >= 0.01 ? costoFijoEscrito : null;
  const fallas: string[] = [];
  for (const p of perfumes) {
    const cambios = inflarPerfume(p, mult, costoFijoAnterior, cfNuevo);
    const r = await supabase.from('Perfumes').update(cambios).eq('id', p.id);
    if (r.error) fallas.push(`${p.nombre} (${r.error.message})`);
  }
  await setConfig('inflacion', pct);
  await setConfig('costo_fijo', cfNuevo ?? Math.round(costoFijoAnterior * mult));
  return fallas;
}

export async function getPedidos(): Promise<Pedido[]> {
  return ok(await supabase.from('Pedidos').select('*').order('id', { ascending: false })) as Pedido[];
}

export async function getItems(pedidoId?: number): Promise<PedidoItem[]> {
  const todos: PedidoItem[] = [];
  for (let desde = 0; ; desde += 1000) {
    let q = supabase.from('PedidosItems').select('*').order('id').range(desde, desde + 999);
    if (pedidoId) q = q.eq('pedido_id', pedidoId);
    const filas = ok(await q) as PedidoItem[];
    todos.push(...filas);
    if (filas.length < 1000) return todos;
  }
}

export async function guardarPedido(pedido: Omit<Pedido, 'id' | 'estado'> & { estado?: Pedido['estado'] }, items: PedidoItem[], id?: number) {
  if (!id) {
    const nuevo = ok(await supabase.from('Pedidos').insert({ ...pedido, estado: 'pendiente' }).select().single()) as Pedido;
    const r = await supabase.from('PedidosItems').insert(items.map((i) => ({ ...i, pedido_id: nuevo.id })));
    if (r.error) {
      await supabase.from('Pedidos').delete().eq('id', nuevo.id);
      throw new Error(r.error.message);
    }
    return nuevo.id;
  }
  const viejos = ok(await supabase.from('PedidosItems').select('id').eq('pedido_id', id));
  if (items.length) ok(await supabase.from('PedidosItems').insert(items.map(({ id: _i, ...it }) => ({ ...it, pedido_id: id }))));
  if (viejos.length) ok(await supabase.from('PedidosItems').delete().in('id', viejos.map((v) => v.id)));
  ok(await supabase.from('Pedidos').update(pedido).eq('id', id));
  return id;
}

export async function cambiarEstado(id: number, estado: Pedido['estado']) {
  ok(await supabase.from('Pedidos').update({ estado }).eq('id', id));
}

export async function borrarPedido(id: number) {
  ok(await supabase.from('PedidosItems').delete().eq('pedido_id', id));
  ok(await supabase.from('Pedidos').delete().eq('id', id));
}

export async function descargarBackup() {
  const out: Record<string, unknown> = { fecha: new Date().toISOString() };
  for (const t of ['Perfumes', 'Pedidos', 'PedidosItems', 'Configuracion']) out[t] = ok(await supabase.from(t).select('*'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }));
  a.download = `vico-backup-${hoy()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function hoy() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function telWhatsApp(t: string) {
  const d = String(t || '').replace(/\D/g, '');
  return d.length === 10 ? '549' + d : d;
}
