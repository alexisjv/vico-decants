import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getConfig, getItems, getPedidos, getPerfumes, supabase, type Config, type Pedido, type PedidoItem, type Perfume } from './api';

type TipoAviso = 'ok' | 'error' | 'info';
interface Aviso { id: number; texto: string; tipo: TipoAviso }

interface Datos {
  session: Session | null;
  listo: boolean;
  perfumes: Perfume[];
  pedidos: Pedido[];
  items: PedidoItem[];
  config: Config;
  ventas: Map<number, number>;
  cargando: boolean;
  recargar: () => Promise<void>;
  setPerfumes: (f: (p: Perfume[]) => Perfume[]) => void;
  avisar: (texto: string, tipo?: TipoAviso) => void;
  avisos: Aviso[];
}

const Ctx = createContext<Datos | null>(null);

export function DatosProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [listo, setListo] = useState(false);
  const [perfumes, setPerfumesState] = useState<Perfume[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [config, setConfig] = useState<Config>({ costoFijo: 0, inflacion: 0, inflFecha: '' });
  const [cargando, setCargando] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((texto: string, tipo: TipoAviso = 'ok') => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a.slice(-1), { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'error' ? 6000 : 3500);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setListo(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [p, pe, it, c] = await Promise.all([getPerfumes(), getPedidos(), getItems(), getConfig()]);
      setPerfumesState(p); setPedidos(pe); setItems(it); setConfig(c);
    } catch (e) {
      avisar((e as Error).message, 'error');
    } finally {
      setCargando(false);
    }
  }, [avisar]);

  const usuario = session?.user.id;
  useEffect(() => { if (usuario) recargar(); }, [usuario, recargar]);

  const ventas = useMemo(() => {
    const m = new Map<number, number>();
    items.forEach((i) => m.set(i.perfume_id, (m.get(i.perfume_id) || 0) + (i.qty || 1)));
    return m;
  }, [items]);

  const value: Datos = {
    session, listo, perfumes, pedidos, items, config, ventas, cargando, recargar,
    setPerfumes: (f) => setPerfumesState(f), avisar, avisos,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDatos() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useDatos fuera de DatosProvider');
  return c;
}
