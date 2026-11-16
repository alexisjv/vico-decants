import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useDatos } from '../lib/store';

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro' | 'whatsapp';
const estilos: Record<Variante, string> = {
  primario: 'bg-tinta text-papel hover:bg-tinta-3 disabled:bg-tinta/40',
  secundario: 'bg-papel text-tinta border border-borde-2 hover:border-tinta',
  fantasma: 'text-tinta hover:bg-crema-2',
  peligro: 'bg-papel text-mal border border-mal/30 hover:bg-mal-bg',
  whatsapp: 'bg-papel text-ok border border-ok/40 hover:bg-ok-bg',
};

export function Boton({ variante = 'primario', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      {...p}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oro disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
    />
  );
}

export function Campo({ label, ayuda, prefijo, sufijo, className = '', ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; ayuda?: ReactNode; prefijo?: string; sufijo?: string }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[13px] font-medium text-niebla">{label}</label>
      <div className="flex h-12 items-center rounded-xl border border-[#B9AE9C] bg-white px-3 focus-within:border-tinta focus-within:ring-2 focus-within:ring-tinta/10">
        {prefijo && <span className="mr-1 text-niebla">{prefijo}</span>}
        <input id={id} {...p} className="min-w-0 flex-1 bg-transparent text-[16px] text-tinta outline-none placeholder:text-niebla" />
        {sufijo && <span className="ml-1 text-niebla">{sufijo}</span>}
      </div>
      {ayuda && <div className="text-[12px] leading-snug text-niebla">{ayuda}</div>}
    </div>
  );
}

export function Chip({ activo, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { activo?: boolean }) {
  return (
    <button
      {...p}
      aria-pressed={activo}
      className={`h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors ${activo ? 'bg-tinta text-papel' : 'border border-borde-2 bg-papel text-tinta hover:border-tinta'}`}
    >
      {children}
    </button>
  );
}

export function Seccion({ titulo, children, className = '', accion }: { titulo?: string; children: ReactNode; className?: string; accion?: ReactNode }) {
  return (
    <section className={`rounded-xl2 border border-borde bg-papel p-4 ${className}`}>
      {(titulo || accion) && (
        <div className="mb-3 flex items-center justify-between">
          {titulo && <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-niebla">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Hoja({ abierta, onCerrar, titulo, children, pie }: { abierta: boolean; onCerrar: () => void; titulo: string; children: ReactNode; pie?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierta) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', k);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', k);
  }, [abierta, onCerrar]);
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/50 backdrop-blur-sm sm:items-center sm:p-6" onClick={onCerrar}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-papel shadow-suave outline-none sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-borde px-5 py-4">
          <h2 className="font-serif text-xl font-semibold">{titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-crema-2"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {pie && <div className="flex gap-3 border-t border-borde px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{pie}</div>}
      </div>
    </div>
  );
}

export function Avisos() {
  const { avisos } = useDatos();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:top-auto lg:items-end lg:pr-6">
      {avisos.map((a) => (
        <div key={a.id} className={`max-w-sm rounded-xl px-4 py-3 text-[14px] font-medium text-papel shadow-suave ${a.tipo === 'error' ? 'bg-mal' : a.tipo === 'info' ? 'bg-tinta-2' : 'bg-ok'}`}>{a.texto}</div>
      ))}
    </div>
  );
}

export function FotoPerfume({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [falla, setFalla] = useState(false);
  if (!src || falla) {
    return (
      <div className={`flex items-center justify-center bg-crema-2 ${className}`}>
        <svg width="34" height="54" viewBox="0 0 34 54" fill="none" stroke="#B9A88B" strokeWidth="1.6" role="img" aria-label={alt}>
          <rect x="12" y="2" width="10" height="7" rx="1.5" /><path d="M14 9v5M20 9v5" /><rect x="3" y="14" width="28" height="38" rx="6" />
        </svg>
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFalla(true)} className={`bg-crema-2 object-contain p-2 ${className}`} />;
}

export function Vacio({ titulo, texto, accion }: { titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl2 border border-dashed border-borde-2 px-6 py-12 text-center">
      <p className="font-serif text-lg font-semibold">{titulo}</p>
      {texto && <p className="max-w-xs text-[14px] text-niebla">{texto}</p>}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}

export function Encabezado({ sobre, titulo, children }: { sobre: string; titulo: string; children?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 pb-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-oro">{sobre}</p>
        <h1 className="font-serif text-[28px] font-semibold leading-tight lg:text-[32px]">{titulo}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </header>
  );
}
