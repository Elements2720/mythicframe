import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { showInAppAlert } from './services/dialogService';

// Global safety shim: intercept any accidental window.alert() and route to in-app dialog
window.alert = (msg?: any) => {
  showInAppAlert(String(msg ?? ''));
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
