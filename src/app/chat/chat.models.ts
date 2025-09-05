export interface ChatContact {
  id: string;         // user id of the contact
  name: string;
  avatarUrl?: string;
  role?: 'owner' | 'guardian';
}

export interface ChatThread {
  id: string;         // thread id = sorted pair: `${a}|${b}`
  a: string;          // user id A
  b: string;          // user id B
  lastAt: string;     // ISO date of last activity
  unreadFor?: string; // user id who has unread messages
}

