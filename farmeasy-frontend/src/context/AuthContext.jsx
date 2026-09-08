import { useEffect, useState } from "react";
import { AuthContext } from "./authContext";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem("user");
        try {
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return Boolean(user && localStorage.getItem("token"));
    });

    useEffect(() => {
        const expire = () => {
            setUser(null);
            setIsAuthenticated(false);
        };
        window.addEventListener("auth-expired", expire);
        return () => window.removeEventListener("auth-expired", expire);
    }, []);

    const login = (userData, token) => {
        localStorage.setItem("user", JSON.stringify(userData));
        localStorage.setItem("token", token);
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = () => {
        for (const key of ["user", "token", "refresh"]) localStorage.removeItem(key);
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
