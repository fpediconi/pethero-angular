export type UserRole = 'owner' | 'guardian';

export interface User {
  id?: number;
  email: string;
  password?: string;     // En mock se guarda plano; en real, NO.
  role: UserRole;
  profileId?: number;
  createdAt?: string;
}
