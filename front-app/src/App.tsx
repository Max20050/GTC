import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { BoardPage } from './pages/BoardPage';
import { OrgPage } from './pages/OrgPage';
import { getToken } from './lib/auth-api';

function ProtectedRoute({ element }: { element: React.ReactElement }) {
  return getToken() ? element : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/home"            element={<ProtectedRoute element={<HomePage />} />} />
        <Route path="/boards/:boardId" element={<ProtectedRoute element={<BoardPage />} />} />
        <Route path="/org/:orgId"      element={<ProtectedRoute element={<OrgPage />} />} />
        <Route path="/"                element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
