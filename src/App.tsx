import { Route, Routes } from 'react-router-dom';
import Accueil from './pages/Accueil';
import NouvelleDictee from './pages/NouvelleDictee';
import DicteeDetail from './pages/DicteeDetail';
import ModeEleve from './pages/ModeEleve';
import Scanner from './pages/Scanner';
import Reglages from './pages/Reglages';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Accueil />} />
      <Route path="/nouvelle" element={<NouvelleDictee />} />
      <Route path="/dictee/:id" element={<DicteeDetail />} />
      <Route path="/eleve/:id" element={<ModeEleve />} />
      <Route path="/scanner" element={<Scanner />} />
      <Route path="/reglages" element={<Reglages />} />
      <Route path="*" element={<Accueil />} />
    </Routes>
  );
}
