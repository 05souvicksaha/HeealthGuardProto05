import { lazy, Suspense, useEffect } from "react";
import { LoadingState } from "./components/LoadingState";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute, RoleRoute } from "./components/RouteGuard";
import { AppProvider } from "./context/AppContext";
import { AuthProvider } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import { AboutPage } from "./pages/AboutPage";
import { AcademyPage } from "./pages/AcademyPage";
import { AdminPage } from "./pages/AdminPage";
import { AiPage } from "./pages/AiPage";
import { AmbulancePage } from "./pages/AmbulancePage";
import { DashboardPage } from "./pages/DashboardPage";
import { DoctorsPage } from "./pages/DoctorsPage";
import { DriverPage } from "./pages/DriverPage";
import { EmergencyPage } from "./pages/EmergencyPage";
import { HospitalsPage } from "./pages/HospitalsPage";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { MyHealthPage } from "./pages/MyHealthPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProfileSetupPage } from "./pages/ProfileSetupPage";

const FirstAidPage = lazy(() => import("./pages/FirstAidPage"));
const PublicEmergencySupportPage = lazy(() => import("./pages/PublicEmergencySupportPage"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname]);
  return null;
}

function ProductRoutes() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-health" element={<MyHealthPage />} />
          <Route path="/ai" element={<AiPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/hospitals" element={<HospitalsPage />} />
          <Route path="/ambulance" element={<AmbulancePage />} />
          <Route path="/first-aid" element={<Suspense fallback={<LoadingState label="Loading first aid guidance…" />}><FirstAidPage /></Suspense>} />
          <Route path="/academy" element={<AcademyPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="/driver" element={<RoleRoute roles={["DRIVER", "ADMIN"]}><DriverPage /></RoleRoute>} />
          <Route path="/admin" element={<RoleRoute roles={["DEVELOPER", "ADMIN"]}><AdminPage /></RoleRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppProvider>
        <AuthProvider>
          <DataProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/emergency-support" element={<Suspense fallback={<LoadingState label="Loading emergency support…" />}><PublicEmergencySupportPage /></Suspense>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<LoginPage />} />
              <Route path="/forgot-password" element={<LoginPage />} />
              <Route path="/reset-password" element={<LoginPage />} />
              <Route path="/verify-email" element={<LoginPage />} />
              <Route path="/profile/new" element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>} />
              <Route path="/*" element={<ProductRoutes />} />
            </Routes>
          </DataProvider>
        </AuthProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
