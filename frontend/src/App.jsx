import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PanicPage } from './pages/PanicPage';
import { LandingPage } from './pages/LandingPage';
import { DispatcherPage } from './pages/DispatcherPage';
import { FirstAidPage } from './pages/FirstAid';
import { VolunteerMode } from './pages/VolunteerMode';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { USSDSimulator } from './components/USSDSimulator';
import { NotificationProvider } from './components/NotificationSystem';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage, SignupPage, UnauthorizedPage } from './pages/LoginPage';
import { VolunteerLoginPage } from './pages/VolunteerLoginPage';
import { DispatcherLoginPage } from './pages/DispatcherLoginPage';
import './App.css';
import { useAuth } from './components/AuthProvider';

const queryClient = new QueryClient();

function ConditionalUSSDSimulator() {
  const { user, role } = useAuth();
  const location = useLocation();
  const allowed = role === 'dispatcher' || role === 'admin';
  const onOpsPages = location.pathname.startsWith('/dispatcher') || location.pathname.startsWith('/analytics');

  if (!user || !allowed || !onOpsPages) return null;
  return <USSDSimulator />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <div className="relative isolate font-sans">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/panic" element={<PanicPage />} />
                <Route path="/first-aid" element={<FirstAidPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="/volunteer-login" element={<VolunteerLoginPage />} />
                <Route path="/dispatcher-login" element={<DispatcherLoginPage />} />
                <Route
                  path="/dispatcher"
                  element={
                    <ProtectedRoute roles={['dispatcher', 'admin']}>
                      <DispatcherPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/volunteer"
                  element={
                    <ProtectedRoute roles={['volunteer', 'admin']}>
                      <VolunteerMode />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute roles={['dispatcher', 'admin']}>
                      <AnalyticsPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>

              <ConditionalUSSDSimulator />
            </div>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
