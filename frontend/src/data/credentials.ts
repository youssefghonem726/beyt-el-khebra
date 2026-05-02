export type Role = 'owner' | 'client' | 'manager';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export const CREDENTIALS: Record<string, { password: string; user: User }> = {
  'owner@bayt.com': {
    password: 'owner123',
    user: {
      id: 'owner-1',
      email: 'owner@bayt.com',
      name: 'Owner Admin',
      role: 'owner',
    },
  },
  'client@bayt.com': {
    password: 'client123',
    user: {
      id: 'client-1',
      email: 'client@bayt.com',
      name: 'Ahmed Client',
      role: 'client',
    },
  },
  'manager@bayt.com': {
    password: 'manager123',
    user: {
      id: 'manager-1',
      email: 'manager@bayt.com',
      name: 'Production Manager',
      role: 'manager',
    },
  },
};

export function validateLogin(email: string, password: string): User | null {
  const cred = CREDENTIALS[email];
  if (cred && cred.password === password) {
    return cred.user;
  }
  return null;
}
