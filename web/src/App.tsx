import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { DatosProvider, useDatos } from './lib/store';
import Layout from './components/Layout';
import Login from './pages/Login';
import Catalogo from './pages/Catalogo';
import PerfumeForm from './pages/PerfumeForm';
import Pedidos from './pages/Pedidos';
import PedidoForm from './pages/PedidoForm';
import Panel from './pages/Panel';
import { Avisos } from './components/ui';

function Rutas() {
  const { session, listo } = useDatos();
  if (!listo) return <div className="flex min-h-screen items-center justify-center text-niebla">Cargando…</div>;
  if (!session) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/perfume/nuevo" element={<PerfumeForm />} />
        <Route path="/perfume/:id" element={<PerfumeForm />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/pedido/nuevo" element={<PedidoForm />} />
        <Route path="/pedido/:id" element={<PedidoForm />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <DatosProvider>
      <HashRouter>
        <Rutas />
        <Avisos />
      </HashRouter>
    </DatosProvider>
  );
}
