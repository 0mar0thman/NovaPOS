// AuthGuard.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAbility } from "@casl/react";
import { AbilityContext } from "@/config/ability";

interface AuthGuardProps {
  children: React.ReactNode;
  action?: string;
  subject?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children, action, subject }) => {
  const token = localStorage.getItem("auth_token");
  const location = useLocation();
  const ability = useAbility(AbilityContext);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (action && subject && !ability.can(action, subject)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;