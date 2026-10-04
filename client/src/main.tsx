import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { captureAttribution } from './lib/attribution';
import './index.css';

captureAttribution(); // remember utm_* / ref from the landing URL before any navigation drops them

createRoot(document.getElementById('root')!).render(
  <StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>,
);
