import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nProvider';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/cyrillic-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/cyrillic-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/cyrillic-600.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>
);
