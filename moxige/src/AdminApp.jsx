import { Routes, Route, Navigate } from "react-router-dom";
import Admin from "./pages/Admin.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { LanguageProvider } from "./i18n.jsx";

export default function AdminApp() {
  return (
    <LanguageProvider>
      <div className="app admin-app" style={{ display:'block', padding:0, alignItems:'stretch', justifyContent:'flex-start', overflow:'visible' }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/withdraws" element={<Admin />} />
            <Route path="/admin/chognzhi" element={<Admin />} />
            <Route path="/admin/zijin" element={<Admin />} />
            <Route path="/login" element={<Navigate to="/admin" replace />} />
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="*" element={<Admin />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </LanguageProvider>
  );
}
