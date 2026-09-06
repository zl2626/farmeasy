import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { BrowserRouter } from 'react-router-dom'; 
createRoot(document.getElementById("root")).render(
  <StrictMode>
        <BrowserRouter>
    <AuthProvider>
      <LanguageProvider>
          <App />
      </LanguageProvider>
    </AuthProvider>
        </BrowserRouter>
  </StrictMode>,
);
