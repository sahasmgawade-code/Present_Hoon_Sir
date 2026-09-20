import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { StudentAuthProvider } from './context/StudentAuthContext.jsx';
import { FacultyAuthProvider } from './context/FacultyAuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import './index.css';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <StudentAuthProvider>
            <FacultyAuthProvider>
              <App />
            </FacultyAuthProvider>
          </StudentAuthProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);