import React, { useMemo } from "react";
import { useAbility } from "@casl/react";
import { AbilityContext, Actions, Subjects } from "@/config/ability";

interface CanProps {
  action: Actions;
  subject: Subjects;
  field?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can = ({ 
  action, 
  subject, 
  field, 
  children, 
  fallback = null 
}: CanProps) => {
  const ability = useAbility(AbilityContext);
  
const canPerformAction = useMemo(() => {
  if (ability.can("manage", "All")) return true;
  return field 
    ? ability.can(action, subject, field)
    : ability.can(action, subject);
}, [ability, action, subject, field]);


  return canPerformAction ? <>{children}</> : <>{fallback}</>;
};