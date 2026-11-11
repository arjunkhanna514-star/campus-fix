// Small text helpers.

// The server stores times as UTC text like "2026-11-11 08:30:00".
export function parseServerDate(value: string): Date {
  return new Date(value.replace(' ', 'T') + 'Z');
}

export function timeAgo(value: string): string {
  const seconds = Math.max(0, (Date.now() - parseServerDate(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  return shortDate(value);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(value: string): string {
  const d = parseServerDate(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dateTime(value: string): string {
  const d = parseServerDate(value);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hh}:${mm}`;
}

// "Block D, room D204" or "Library, upper floor study area".
export function whereText(issue: { building: string; room: string | null }): string {
  return issue.room ? `${issue.building}, room ${issue.room}` : issue.building;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}
