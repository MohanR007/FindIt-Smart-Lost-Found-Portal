import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ItemsProvider } from './context/ItemsContext';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BrowsePage from './pages/BrowsePage';
import ReportPage from './pages/ReportPage';
import ItemDetailPage from './pages/ItemDetailPage';
import DashboardPage from './pages/DashboardPage';
import FinderPage from './pages/FinderPage';
import MatchesPage from './pages/MatchesPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ItemsProvider>
          <Routes>
            {/* Auth pages - no nav/footer */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Main app layout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/report" element={<ReportPage />} />
              <Route path="/report/:type" element={<ReportPage />} />
              <Route path="/items/:id" element={<ItemDetailPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/finder" element={<FinderPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/admin" element={<AdminPage />} />
              {/* Fallback route */}
              <Route path="*" element={<BrowsePage />} />
            </Route>
          </Routes>
        </ItemsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
