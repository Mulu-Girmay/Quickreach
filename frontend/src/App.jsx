import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PanicPage } from './pages/PanicPage';
import { DispatcherPage } from './pages/DispatcherPage';
import { USSDSimulator } from './components/USSDSimulator';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="relative isolate">
          <Routes>
            <Route path="/" element={<PanicPage />} />
            <Route path="/panic" element={<PanicPage />} />
            <Route path="/dispatcher" element={<DispatcherPage />} />
          </Routes>
          
          <USSDSimulator />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
