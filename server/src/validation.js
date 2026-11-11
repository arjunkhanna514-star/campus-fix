// Input rules. Every request body is checked against one of these before
// it gets anywhere near the database.

const { z } = require('zod');
const { BUILDINGS, IMPACTS, STATUSES } = require('./config');
const { HttpError } = require('./middleware/errors');

// Turns "" or missing into null, and trims everything else.
const optionalText = (max, label) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer`)
    .optional()
    .transform((value) => (value ? value : null));

const registerSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be 60 characters or fewer'),
  email: z
    .string({ error: 'Email is required' })
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email address')),
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be 100 characters or fewer'),
});

const loginSchema = z.object({
  email: z.string({ error: 'Email is required' }).trim().toLowerCase().min(1, 'Email is required'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

const issueSchema = z.object({
  category_id: z.coerce.number({ error: 'Choose a category' }).int().positive('Choose a category'),
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(4, 'Title must be at least 4 characters')
    .max(80, 'Title must be 80 characters or fewer'),
  description: z
    .string({ error: 'Description is required' })
    .trim()
    .min(10, 'Describe the problem in at least 10 characters')
    .max(600, 'Description must be 600 characters or fewer'),
  building: z.enum(BUILDINGS, { error: 'Choose a building from the list' }),
  room: optionalText(30, 'Room'),
  location_note: optionalText(120, 'Location note'),
  impact: z.enum(IMPACTS, { error: 'Impact must be Low, Medium or High' }).default('Medium'),
});

const commentSchema = z.object({
  body: z
    .string({ error: 'Write a comment first' })
    .trim()
    .min(2, 'Write at least 2 characters')
    .max(500, 'Comments must be 500 characters or fewer'),
});

const statusSchema = z.object({
  status: z.enum(STATUSES, { error: 'Unknown status' }),
  note: optionalText(200, 'Note'),
});

// Runs a schema and throws a 400 with the first readable problem.
function parse(schema, data) {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    throw new HttpError(400, result.error.issues[0].message);
  }
  return result.data;
}

module.exports = { registerSchema, loginSchema, issueSchema, commentSchema, statusSchema, parse };
