import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, MessageCircle, Plus } from 'lucide-react';
import { cambiarEstado, getItems, telWhatsApp, type Pedido } from '../lib/api';
import { pesos } from '../lib/precios';
import { useDatos } from '../lib/store';
import { Chip, Encabezado, Vacio } from '../components/ui';

const filtros = { todos: 'Todos', pendiente: 'Pendientes', terminado: 'Terminados' } as const;
type Filtro = keyof typeof filtros;

export async function abrirWhatsApp(p: Pedido) {
  const ventana = window.open('', '_blank');
  const items = await getItems(p.id);
  const lineas = items.map((i) => `• ${i.perfume_nombre} ${String(i.ml).replace('.', ',')} ml × ${i.qty} — ${pesos(i.precio_unit * i.qty)}`);
  const texto = `Hola${p.cliente_nombre ? ' ' + p.cliente_nombre : ''}! Te paso el detalle de tu pedido #${String(p.id).padStart(5, '0')}:\n${lineas.join('\n')}\nTotal: ${pesos(p.total_venta)}`;
  const url = `https://wa.me/${telWhatsApp(p.cliente_tel)}?text=${encodeURIComponent(texto)}`;
  if (ventana) ventana.location.href = url;
  else location.href = url;
}

export default function Pedidos() {
  const { pedidos, recargar, avisar } = useDatos();
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const lista = pedidos.filter((p) => filtro === 'todos' || p.estado === filtro);

  async function alternar(p: Pedido) {
    try {
      await cambiarEstado(p.id, p.estado === 'pendiente' ? 'terminado' : 'pendiente');
      await recargar();
    } catch (e) {
      avisar((e as Error).message, 'error');
    }
  }

  return (
    <>
      <Encabezado sobre="Ventas" titulo="Pedidos">
        <Link to="/pedido/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-tinta px-4 text-[15px] font-semibold text-papel hover:bg-tinta-3">
          <Plus size={17} aria-hidden="true" />Nuevo pedido
        </Link>
      </Encabezado>
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {(Object.keys(filtros) as Filtro[]).map((f) => (
          <Chip key={f} activo={filtro === f} onClick={() => setFiltro(f)}>
            {filtros[f]} · {f === 'todos' ? pedidos.length : pedidos.filter((p) => p.estado === f).length}
          </Chip>
        ))}
      </div>
      {!lista.length ? (
        <Vacio titulo="No hay pedidos acá" texto="Cuando cargues un pedido va a aparecer en esta lista." />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {lista.map((p) => {
            const fin = p.estado === 'terminado';
            const fecha = p.fecha ? new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }) : '';
            return (
              <li key={p.id} className="flex min-w-0 flex-col gap-3 rounded-xl2 border border-borde bg-papel p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/pedido/${p.id}`} className="min-w-0">
                    <p className="text-[12px] text-niebla">#{String(p.id).padStart(5, '0')} · {fecha}</p>
                    <h2 className="truncate font-serif text-lg font-semibold">{p.cliente_nombre || 'Sin nombre'}</h2>
                    {p.notas && <p className="mt-0.5 line-clamp-2 text-[13px] text-niebla">{p.notas}</p>}
                  </Link>
                  <button onClick={() => alternar(p)} aria-label={`Marcar como ${fin ? 'pendiente' : 'terminado'}`}
                    className={`flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ${fin ? 'bg-ok-bg text-ok' : 'bg-oro-claro/50 text-tinta'}`}>
                    {fin ? <Check size={14} aria-hidden="true" /> : <Clock size={14} aria-hidden="true" />}{fin ? 'Terminado' : 'Pendiente'}
                  </button>
                </div>
                <div className="flex items-end justify-between gap-2 border-t border-borde pt-3">
                  <div>
                    <div className="font-serif text-2xl font-semibold">{pesos(p.total_venta)}</div>
                    <div className="text-[12px] text-ok">Ganancia {pesos(p.total_venta - p.total_costo)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => abrirWhatsApp(p).catch((e) => avisar(e.message, 'error'))} aria-label="Enviar por WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-xl border border-ok/40 text-ok hover:bg-ok-bg"><MessageCircle size={19} /></button>
                    <Link to={`/pedido/${p.id}`} className="flex h-11 items-center rounded-xl border border-borde-2 px-4 text-[14px] font-semibold hover:border-tinta">Editar</Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
