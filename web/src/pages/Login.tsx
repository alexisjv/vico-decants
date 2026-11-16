import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/api';
import { Boton, Campo } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave });
    setEnviando(false);
    if (err) setError(/invalid/i.test(err.message) ? 'Email o contraseña incorrectos' : err.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-tinta px-5">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-3xl bg-papel p-7 shadow-suave">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-oro">VICO DECANTS</p>
        <h1 className="mb-1 font-serif text-3xl font-semibold">Bienvenido</h1>
        <p className="mb-6 text-[14px] text-niebla">Ingresá con tu usuario para administrar el catálogo.</p>
        <div className="flex flex-col gap-4">
          <Campo label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Campo label="Contraseña" type="password" autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} required />
          {error && <p role="alert" className="rounded-xl bg-mal-bg px-3 py-2 text-[14px] text-mal">{error}</p>}
          <Boton type="submit" disabled={enviando} className="mt-1 h-12 w-full">{enviando ? 'Entrando…' : 'Entrar'}</Boton>
        </div>
      </form>
    </div>
  );
}
