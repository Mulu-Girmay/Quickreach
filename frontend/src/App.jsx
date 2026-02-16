import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PanicPage } from './pages/PanicPage';
import { DispatcherPage } from './pages/DispatcherPage';
import { HospitalDashboard } from './pages/HospitalDashboard';
import { USSDSimulator } from './components/USSDSimulator';
import { NotificationProvider } from './components/NotificationSystem';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <Router>
          <div className="relative isolate font-sans">
            <Routes>
              <Route path="/" element={<PanicPage />} />
              <Route path="/panic" element={<PanicPage />} />
              <Route path="/dispatcher" element={<DispatcherPage />} />
              <Route path="/hospital" element={<HospitalDashboard />} />
            </Routes>
            
            <USSDSimulator />
          </div>
        </Router>
      </NotificationProvider>
    </QueryClientProvider>
  );
}

export default App;
