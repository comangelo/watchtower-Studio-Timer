import { useState, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import HomePage from "@/pages/HomePage";
import ReportPage from "@/pages/ReportPage";
import { useLanguage } from "@/i18n";

function App() {
  useLanguage(); // al cambiar de idioma se vuelve a pintar toda la app
  return (
    <div className="min-h-screen bg-white">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/informe" element={<ReportPage />} />
        </Routes>
      </BrowserRouter>
      {/* Arriba, para no tapar los botones de la parte inferior */}
      <Toaster position="top-center" />
    </div>
  );
}

export default App;
