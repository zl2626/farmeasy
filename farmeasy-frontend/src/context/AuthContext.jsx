import { createContext, useContext, useEffect, useState } from "react";
import { clearAuthStorage } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Synchronously initialize state so we don't flash 'unauthenticated' on refresh
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return null;
        try {
            return JSON.parse(storedUser);
        } catch {
            localStorage.removeItem("user");
            return null;
        }
    });
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return !!localStorage.getItem("token");
    });

    useEffect(() => {
        const handleExpiredSession = () => {
            setUser(null);
            setIsAuthenticated(false);
        };
        window.addEventListener("auth:logout", handleExpiredSession);
        return () => window.removeEventListener("auth:logout", handleExpiredSession);
    }, []);

    const login = (userData, token, refreshToken) => {
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", token);
        if (refreshToken) localStorage.setItem("refresh", refreshToken);
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        clearAuthStorage();
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
