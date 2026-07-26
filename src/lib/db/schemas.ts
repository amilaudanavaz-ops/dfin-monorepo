// src/lib/db/schemas.ts

export const taskSchema = {
  title: 'task schema',
  version: 0,
  description: 'Describes a scheduled task in DFIN',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    title: { type: 'string' },
    durationMinutes: { type: 'number' },
    scheduledDate: { type: 'string' }, // Format: YYYY-MM-DD
    scheduledTime: { type: 'string' }, // Format: HH:mm
    status: { type: 'string', default: 'pending' }, // pending, in_session, completed, skipped
    updatedAt: { type: 'number' } // Unix timestamp for Yjs sync
  },
  required: ['id', 'title', 'durationMinutes', 'scheduledDate', 'status', 'updatedAt']
};

export const sessionSchema = {
  title: 'session schema',
  version: 0,
  description: 'Describes an active execution session',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    startTime: { type: 'number' }, // T0 Unix timestamp
    plannedDurationHours: { type: 'number' },
    status: { type: 'string', default: 'active' } // active, completed
  },
  required: ['id', 'startTime', 'plannedDurationHours', 'status']
};