// Central settings and fixed lists. Everything else imports from here,
// so a rule (like the status order) is only written down once.

const PORT = Number(process.env.PORT) || 4000;

// In a real deployment this comes from the environment. The default keeps local demos simple.
const JWT_SECRET = process.env.JWT_SECRET || 'campus-fix-local-dev-secret';
const JWT_EXPIRES_IN = '7d';

// The only allowed life cycle of a report. Admins move it one step at a time.
const STATUSES = ['Reported', 'Acknowledged', 'In Progress', 'Resolved'];
const NEXT_STATUS = {
  Reported: 'Acknowledged',
  Acknowledged: 'In Progress',
  'In Progress': 'Resolved',
};

const IMPACTS = ['Low', 'Medium', 'High'];

const BUILDINGS = [
  'Block A',
  'Block B',
  'Block C',
  'Block D',
  'Block E',
  'Block F',
  'Library',
  'Canteen',
  'Sports Hall',
  'Car Park',
  'Outdoor areas',
];

// Community goal shown on the feed: fixes completed in the last 30 days.
const CAMPUS_GOAL = 20;

module.exports = {
  PORT,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  STATUSES,
  NEXT_STATUS,
  IMPACTS,
  BUILDINGS,
  CAMPUS_GOAL,
};
