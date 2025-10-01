// ability.ts
import { createContext } from "react";
import { Ability, AbilityBuilder, AbilityClass } from "@casl/ability";

export type Actions = "read" | "create" | "update" | "delete" | "manage";
export type Subjects =
  | "User"
  | "Product"
  | "Category"
  | "Supplier"
  | "Customer"
  | "Expense"
  | "PurchaseInvoice"
  | "SalesInvoice"
  | "Reports"
  | "Dashboard"
  | "Role"
  | "Permission"
  | "All"
  | "NotDeleted"
  ;

export type AppAbility = Ability<[Actions, Subjects]>;
export const AppAbility = Ability as AbilityClass<AppAbility>;

export const AbilityContext = createContext<AppAbility>(new AppAbility([]));

export type Rule = { action: Actions; subject: Subjects; fields?: string[]; conditions?: any };

export const createAppAbility = (rules: Rule[]) => {
  const { can, build } = new AbilityBuilder(AppAbility);

  rules.forEach(({ action, subject, fields, conditions }) => {
    can(action, subject, fields, conditions);
  });
 
  return build();
};

export const initialAbility = new AppAbility([]);

export function defineAbilityFor(role: string) {
  const { can, build } = new AbilityBuilder(AppAbility);

  switch (role) {
    case 'admin':
      can('manage', 'All');
      break;
    case 'manager':
      can('read', 'Dashboard');
      can(['read', 'create', 'update'], [
        'Product',
        'Category',
        'Supplier',
        'Customer',
        'Expense',
        'PurchaseInvoice', 
        'SalesInvoice'
      ]);
      can('read', 'Reports'); 
      break;
    case 'user':
      can('read', 'Dashboard');
      can(['read', 'create', 'update'], 'SalesInvoice');
      break;
    default:
      break;
  }

  return build();
}