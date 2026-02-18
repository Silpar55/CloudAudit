// AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { useMe } from "~/hooks/useMe";
import { useQueryClient } from "@tanstack/react-query";

type AuthContextType = {
  user: any;
  isAuthenticated: boolean;
  isLoading: boolean;
  isChecking: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();

  // 1. Initialize State
  const [token, setToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // 2. LINK THE STATE: Pass '!!token' to useMe
  // This ensures that as soon as 'setToken' has a value, 'useMe' starts fetching.
  console.log("Calling useMe()");
  const { data: user, isLoading } = useMe(!!token);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      setToken(storedToken);
    }
    setIsChecking(false);
  }, []);

  const login = (newToken: string) => {
    console.log("AuthContext login():", newToken);
    localStorage.setItem("token", newToken);
    setToken(newToken);

    // Optional: You can still invalidate, but setting 'enabled' to true
    // in the line above will usually trigger the fetch automatically.
    queryClient.invalidateQueries({ queryKey: ["me"] });
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    queryClient.setQueryData(["me"], null);
    queryClient.removeQueries({ queryKey: ["me"] });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isChecking,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
