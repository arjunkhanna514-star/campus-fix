// Central settings and fixed lists. Everything else imports from here,
// so a rule (like the status order) is only written down once.

const path = require('path');

const PORT = Number(process.env.PORT) || 4000;

// On Vercel the code folder is read-only and only /tmp can be written, so the
// database and uploaded photos live there. Everywhere else they sit in server/.
const ON_VERCEL = !!process.env.VERCEL;
const DATA_DIR = process.env.DATA_DIR || (ON_VERCEL ? '/tmp' : path.join(__dirname, '..'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

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

// The real MCAST Paola blocks, named as on the official campus map. The app's
// campus map uses the same names, so a report can be shown on the map.
// Which team fixes which category. Used to fill the departments table.
const DEPARTMENTS = [
  { name: 'IT Services', icon: 'laptop', categories: ['Computers & IT', 'Network & Wi-Fi', 'Projector & AV'] },
  { name: 'Estates & Maintenance', icon: 'hammer-wrench', categories: ['Furniture', 'Water & Plumbing', 'Electrical'] },
  { name: 'Cleaning Services', icon: 'spray-bottle', categories: ['Cleanliness'] },
  { name: 'Health & Safety', icon: 'shield-check', categories: ['Safety'] },
  { name: 'Student Services', icon: 'account-group', categories: ['Other'] },
];

const BUILDINGS = [
  'Block A',
  'Block B',
  'Block C',
  'Block D',
  'Block E',
  'Block F',
  'Block G',
  'Block H',
  'Block I',
  'Block LB',
  'Block M',
  'Block N',
  'Block S',
  'Block U',
  'MRC Library',
  'Lower Gym',
  'Upper Gym',
  'Car park',
  'Outdoor areas',
];

// Community goal shown on the feed: fixes completed in the last 30 days.
const CAMPUS_GOAL = 20;

module.exports = {
  PORT,
  ON_VERCEL,
  DATA_DIR,
  UPLOAD_DIR,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  STATUSES,
  NEXT_STATUS,
  IMPACTS,
  BUILDINGS,
  DEPARTMENTS,
  CAMPUS_GOAL,
};
