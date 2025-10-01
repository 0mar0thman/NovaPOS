// abilityMapper.ts
import { Rule } from "./ability";

export function mapBackendPermissions(permissions: string[]): Rule[] {
  return permissions.map((perm) => {
    // perm = "read-User" أو "create-Product" مثلاً
    const [action, subject] = perm.split("-") as [Rule["action"], Rule["subject"]];
    return { action, subject };
  });
}
