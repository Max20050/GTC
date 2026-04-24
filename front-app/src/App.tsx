import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { BoardPage } from './pages/BoardPage';
import { OrgPage } from './pages/OrgPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/home"            element={<HomePage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/org/:orgId"      element={<OrgPage />} />
        <Route path="/"                element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
