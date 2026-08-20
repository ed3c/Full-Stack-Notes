import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HttpWorkQueueApi } from './api.js';
import { WorkQueueScreen } from './work-queue.js';
import './styles.css';

const root = document.getElementById('root');
if (root === null) throw new Error('root element not found');

const api = new HttpWorkQueueApi(import.meta.env.VITE_API_BASE_URL ?? '');
createRoot(root).render(
  <StrictMode>
    <WorkQueueScreen api={api} />
  </StrictMode>
);
