export interface User {
  id: number;
  name: string;
  email: string;
  role_id?: number;
  roles: string[];
  permissions: string[];
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}