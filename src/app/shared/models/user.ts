export type UserRole = 'OWNER' | 'GUARDIAN';
export interface User {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  avatarUrl?: string;
  favorites?: string[]; // guardian IDs
}