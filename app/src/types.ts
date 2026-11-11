// The shapes of the data the server sends. Shared by every screen.

export type Status = 'Reported' | 'Acknowledged' | 'In Progress' | 'Resolved';
export type Impact = 'Low' | 'Medium' | 'High';
export type Role = 'student' | 'admin';

export const STATUSES: Status[] = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];
export const NEXT_STATUS: Partial<Record<Status, Status>> = {
  Reported: 'Acknowledged',
  Acknowledged: 'In Progress',
  'In Progress': 'Resolved',
};

export type User = { id: number; name: string; email: string; role: Role };

export type Category = { id: number; name: string; icon: string };

export type Issue = {
  id: number;
  title: string;
  description: string;
  building: string;
  room: string | null;
  location_note: string | null;
  impact: Impact;
  status: Status;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  category: Category;
  reporter: { id: number; name: string };
  upvotes: number;
  hasUpvoted: boolean;
  isMine: boolean;
};

export type HistoryEntry = {
  id: number;
  old_status: Status | null;
  new_status: Status;
  note: string | null;
  changed_at: string;
  changed_by_name: string;
  changed_by_role: Role;
};

export type IssueDetail = Issue & { history: HistoryEntry[] };

export type Level = {
  name: string;
  index: number;
  min: number;
  nextName: string | null;
  nextMin: number | null;
  pointsToNext: number;
  progress: number;
};

export type Badge = {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earned_at: string | null;
};

export type PointEvent = {
  id: number;
  amount: number;
  reason: string;
  issue_id: number | null;
  issue_title: string | null;
  created_at: string;
};

export type Me = {
  user: User;
  points: number;
  level: Level;
  rank: number | null;
  stats: { reports: number; acknowledged: number; resolved: number; upvotesGiven: number; upvotesReceived: number };
  badges: Badge[];
  events: PointEvent[];
};

export type Meta = {
  categories: Category[];
  buildings: string[];
  impacts: Impact[];
  statuses: Status[];
  levels: { name: string; min: number }[];
  pointRules: { label: string; amount: number }[];
};

export type LeaderRow = { id: number; name: string; points: number; rank: number; level: string; isMe: boolean };
export type Leaderboard = { period: 'week' | 'all'; top: LeaderRow[]; me: LeaderRow | null; totalStudents: number };

export type CampusHealth = { goal: number; resolvedLast30Days: number; open: number; total: number; percentResolved: number };

export type AdminStats = {
  byStatus: Record<Status, number>;
  total: number;
  open: number;
  byCategory: { id: number; name: string; icon: string; open: number }[];
  topOpen: Issue[];
  avgResolveHours: number | null;
};
