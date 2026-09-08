import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { HashRouter } from 'react-router-dom';
createRoot(document.getElementById("root")).render(
  <StrictMode>
        <HashRouter>
    <AuthProvider>
      <LanguageProvider>
          <App />
      </LanguageProvider>
    </AuthProvider>
        </HashRouter>
  </StrictMode>,
);
