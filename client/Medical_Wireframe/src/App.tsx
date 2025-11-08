import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import MainLayout from './components/layout/MainLayout';
import Login from './components/pages/Login';
import Dashboard from './components/pages/Dashboard';
import Upload from './components/pages/Upload';
import LiveCamera from './components/pages/LiveCamera';
import Results from './components/pages/Results';
import ResultDetails from './components/pages/ResultDetails';
import Patients from './components/pages/Patients';
import PatientProfile from './components/pages/PatientProfile';
import Reports from './components/pages/Reports';
import Settings from './components/pages/Settings';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/camera" element={<LiveCamera />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:id" element={<ResultDetails />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id" element={<PatientProfile />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </MainLayout>
      <Toaster />
    </BrowserRouter>
  );
}
