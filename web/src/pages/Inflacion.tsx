import { useEffect, useState } from 'react';
import { aplicarInflacion } from '../lib/api';
import { pesos } from '../lib/precios';
import { useDatos } from '../lib/store';
import { Boton, Campo, Hoja } from '../components/ui';

const fecha = (iso: string) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

export default function Inflacion({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const { perfumes, config, recargar, avisar } = useDatos();
  const [pct, setPct] = useState('');
  const [cf, setCf] = useState('');
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => { if (abierta) { setPct(''); setCf(String(config.costoFijo || '')); } }, [abierta, config.costoFijo]);

  const ultima = config.inflFecha ? new Date(config.inflFecha) : null;
  const ahora = new Date();
  const esteMes = !!ultima && ultima.getFullYear() === ahora.getFullYear() && ultima.getMonth() === ahora.getMonth();
  const valor = parseFloat(pct.replace(',', '.'));
  const valido = !isNaN(valor) && valor > -100 && valor <= 100;

  async function aplicar() {
    setAplicando(true);
    try {
      const cfNum = cf === '' ? null : Math.max(0, parseFloat(cf) || 0);
      const fallas = await aplicarInflacion(perfumes, valor, config.costoFijo, cfNum);
      await recargar();
      if (fallas.length) avisar(`No se actualizaron: ${fallas.join(', ')}`, 'error');
      else avisar(`Precios actualizados un ${valor}%`);
      onCerrar();
    } catch (e) {
      avisar((e as Error).message, 'error');
    } finally {
      setAplicando(false);
    }
  }

  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Actualizar por inflación"
      pie={<>
        <Boton variante="secundario" onClick={onCerrar} className="flex-1">Cancelar</Boton>
        <Boton onClick={aplicar} disabled={!valido || aplicando} className="flex-[2]">{aplicando ? 'Aplicando…' : `Aplicar a ${perfumes.length} perfumes`}</Boton>
      </>}>
      <div className="flex flex-col gap-4">
        <p className="text-[14px] leading-relaxed text-niebla">
          El precio de compra no cambia: se guarda la inflación acumulada. Sin redondeo, el precio sube exactamente ese %; con redondeo, sube al múltiplo siguiente.
        </p>
        {esteMes && (
          <p role="alert" className="rounded-xl bg-oro-claro/40 px-3 py-2 text-[14px]">
            Este mes ya aplicaste <strong>{config.inflacion}%</strong> el {fecha(config.inflFecha)}.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Inflación del mes" inputMode="decimal" sufijo="%" placeholder="2,5" value={pct} onChange={(e) => setPct(e.target.value)} autoFocus />
          <Campo label="Costo de envase" type="number" min="0" inputMode="decimal" prefijo="$" value={cf} onChange={(e) => setCf(e.target.value)} ayuda={`Hoy: ${pesos(config.costoFijo)}`} />
        </div>
      </div>
    </Hoja>
  );
}
