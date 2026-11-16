import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, LayoutGrid, LogOut, PlusCircle, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/api';
import { useDatos } from '../lib/store';

const secciones = [
  { to: '/', label: 'Catálogo', icono: LayoutGrid, end: true },
  { to: '/perfume/nuevo', label: 'Cargar', icono: PlusCircle, end: false },
  { to: '/pedidos', label: 'Pedidos', icono: ShoppingBag, end: false },
  { to: '/panel', label: 'Panel', icono: BarChart3, end: false },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pedidos, perfumes } = useDatos();
  const pendientes = pedidos.filter((p) => p.estado === 'pendiente').length;
  const badge = (to: string) => (to === '/pedidos' && pendientes ? pendientes : to === '/' && perfumes.length ? perfumes.length : 0);

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 bg-tinta px-4 py-6 text-papel lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-3 pb-6">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-oro-claro">VICO</p>
          <p className="font-serif text-2xl font-semibold">Decants</p>
        </div>
        {secciones.map(({ to, label, icono: I, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${isActive ? 'bg-tinta-3 font-semibold text-oro-claro' : 'text-[#BDB4A6] hover:bg-tinta-2 hover:text-papel'}`}>
            <I size={19} aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {badge(to) > 0 && <span className="rounded-full bg-tinta-2 px-2 text-[12px] text-oro-claro">{badge(to)}</span>}
          </NavLink>
        ))}
        <button onClick={() => supabase.auth.signOut()} className="mt-auto flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] text-[#BDB4A6] hover:bg-tinta-2 hover:text-papel">
          <LogOut size={19} aria-hidden="true" /> Salir
        </button>
      </aside>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">{children}</main>

      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 bg-tinta pb-[env(safe-area-inset-bottom)] lg:hidden">
        {secciones.map(({ to, label, icono: I, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] ${isActive ? 'font-semibold text-oro-claro' : 'text-[#A79F94]'}`}>
            <I size={22} aria-hidden="true" />
            {label}
            {to === '/pedidos' && pendientes > 0 && <span className="absolute right-[calc(50%-22px)] top-2 rounded-full bg-oro-vivo px-1.5 text-[10px] font-bold text-tinta">{pendientes}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
