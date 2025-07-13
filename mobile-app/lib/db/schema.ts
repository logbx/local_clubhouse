import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  username: text('username').unique().notNull(),
  fullName: text('full_name'),
  profileImage: text('profile_image'),
  bio: text('bio'),
  location: text('location'),
  website: text('website'),
  verified: integer('verified', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastActiveAt: integer('last_active_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  // Offline sync fields
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).default('synced'),
  lastSyncAt: integer('last_sync_at'),
  version: integer('version').default(1),
});

// Clubs table
export const clubs = sqliteTable('clubs', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  username: text('username').unique().notNull(),
  description: text('description'),
  logoUrl: text('logo_url'),
  bannerUrl: text('banner_url'),
  location: text('location'),
  website: text('website'),
  contactEmail: text('contact_email'),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  memberCount: integer('member_count').default(0),
  eventCount: integer('event_count').default(0),
  createdBy: text('created_by').references(() => users.id).notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  // Offline sync fields
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).default('synced'),
  lastSyncAt: integer('last_sync_at'),
  version: integer('version').default(1),
});

// Club members table
export const clubMembers = sqliteTable('club_members', {
  id: text('id').primaryKey(),
  clubId: text('club_id').references(() => clubs.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  role: text('role', { enum: ['owner', 'admin', 'moderator', 'member'] }).notNull(),
  status: text('status', { enum: ['pending', 'active', 'suspended', 'banned'] }).default('pending'),
  joinedAt: integer('joined_at'),
  invitedBy: text('invited_by').references(() => users.id),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  // Offline sync fields
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).default('synced'),
  lastSyncAt: integer('last_sync_at'),
  version: integer('version').default(1),
});

// Events table
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  type: text('type', { enum: ['tournament', 'meetup', 'workshop', 'social', 'competition'] }).notNull(),
  status: text('status', { enum: ['draft', 'published', 'active', 'completed', 'cancelled'] }).default('draft'),
  startDate: integer('start_date').notNull(),
  endDate: integer('end_date'),
  timezone: text('timezone').notNull(),
  isAllDay: integer('is_all_day', { mode: 'boolean' }).default(false),
  maxAttendees: integer('max_attendees'),
  currentAttendees: integer('current_attendees').default(0),
  isPublic: integer('is_public', { mode: 'boolean' }).default(true),
  requiresApproval: integer('requires_approval', { mode: 'boolean' }).default(false),
  entryFee: real('entry_fee').default(0),
  currency: text('currency').default('USD'),
  clubId: text('club_id').references(() => clubs.id),
  organizerId: text('organizer_id').references(() => users.id).notNull(),
  // Location data
  venueName: text('venue_name'),
  venueAddress: text('venue_address'),
  venueCity: text('venue_city'),
  venueCountry: text('venue_country'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  // Metadata
  tags: text('tags'), // JSON array
  customFields: text('custom_fields'), // JSON object
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  // Offline sync fields
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).default('synced'),
  lastSyncAt: integer('last_sync_at'),
  version: integer('version').default(1),
});

// Event attendees table
export const eventAttendees = sqliteTable('event_attendees', {
  id: text('id').primaryKey(),
  eventId: text('event_id').references(() => events.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  status: text('status', { enum: ['pending', 'confirmed', 'declined', 'waitlist', 'checked_in'] }).default('pending'),
  rsvpedAt: integer('rsvped_at').notNull(),
  checkedInAt: integer('checked_in_at'),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  // Offline sync fields
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).default('synced'),
  lastSyncAt: integer('last_sync_at'),
  version: integer('version').default(1),
});

// Tournaments table
export const tournaments = sqliteTable('tournaments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type', { enum: ['single_elimination', 'double_elimination', 'swiss', 'round_robin'] }).notNull(),
  format: text('format').notNull(),
  status: text('status', { enum: ['draft', 'registration', 'active', 'completed', 'cancelled'] }).default('draft'),
  maxPlayers: integer('max_players').notNull(),
  currentPlayers: integer('current_players').default(0),
  currentRound: integer('current_round').default(0),
  totalRounds: integer('total_rounds').default(0),
  isLive: integer('is_live', { mode: 'boolean' }).default(false),
  startDate: integer('start_date').notNull(),
  endDate: integer('end_date'),
  registrationDeadline: integer('registration_deadline').notNull(),
  entryFee: real('entry_fee').default(0),
  currency: text('currency').default('USD'),
  eventId: text('event_id').references(() => events.id),
  clubId: text('club_id').references(() => clubs.id),
  organizerId: text('organizer_id').references(() => users.id).notNull(),
  // Settings
  settings: text('settings'), // JSON object
  prizes: text('prizes'), // JSON array
  rules: text('rules'),
  // Venue
  venueName: text('venue_name'),
  venueAddress: text('venue_address'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  // Statistics
  stats: text('stats'), // JSON object
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  // Offline sync fields
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).default('synced'),
  lastSyncAt: integer('last_sync_at'),
  version: integer('version').default(1),
});

// Messages table (for chat functionality)
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  type: text('type', { enum: ['text', 'image', 'file', 'system'] }).default('text'),
  senderId: text('sender_id').references(() => users.id).notNull(),
  channelId: text('channel_id').notNull(), // Could be club ID, event ID, etc.
  channelType: text('channel_type', { enum: ['club', 'event', 'tournament', 'direct'] }).notNull(),
  replyToId: text('reply_to_id').references(() => messages.id),
  attachments: text('attachments'), // JSON array
  metadata: text('metadata'), // JSON object for additional data
  editedAt: integer('edited_at'),
  deletedAt: integer('deleted_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  // Offline sync fields
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).default('synced'),
  lastSyncAt: integer('last_sync_at'),
  version: integer('version').default(1),
});

// Notifications table
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  type: text('type', { enum: ['club_invite', 'event_reminder', 'tournament_update', 'message', 'system'] }).notNull(),
  data: text('data'), // JSON object with notification-specific data
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  readAt: integer('read_at'),
  actionUrl: text('action_url'),
  imageUrl: text('image_url'),
  expiresAt: integer('expires_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  // Offline sync fields
  syncStatus: text('sync_status', { enum: ['synced', 'pending', 'conflict'] }).default('synced'),
  lastSyncAt: integer('last_sync_at'),
  version: integer('version').default(1),
});

// Offline queue table for pending operations
export const offlineQueue = sqliteTable('offline_queue', {
  id: text('id').primaryKey(),
  operation: text('operation', { enum: ['create', 'update', 'delete'] }).notNull(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull(),
  data: text('data'), // JSON object with the data to sync
  endpoint: text('endpoint').notNull(),
  method: text('method', { enum: ['GET', 'POST', 'PUT', 'DELETE'] }).notNull(),
  headers: text('headers'), // JSON object
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  priority: integer('priority').default(0), // Higher numbers = higher priority
  scheduledFor: integer('scheduled_for'), // Unix timestamp for delayed execution
  lastAttemptAt: integer('last_attempt_at'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at').notNull(),
});

// Cache table for API responses
export const apiCache = sqliteTable('api_cache', {
  id: text('id').primaryKey(), // Hash of the request
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  params: text('params'), // JSON object
  response: text('response').notNull(), // JSON response
  headers: text('headers'), // JSON object
  etag: text('etag'),
  expiresAt: integer('expires_at'),
  createdAt: integer('created_at').notNull(),
  accessedAt: integer('accessed_at').notNull(),
});

// File uploads table
export const fileUploads = sqliteTable('file_uploads', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  url: text('url'),
  thumbnailUrl: text('thumbnail_url'),
  uploadProgress: integer('upload_progress').default(0),
  status: text('status', { enum: ['pending', 'uploading', 'completed', 'failed'] }).default('pending'),
  uploadedBy: text('uploaded_by').references(() => users.id).notNull(),
  associatedTable: text('associated_table'),
  associatedId: text('associated_id'),
  metadata: text('metadata'), // JSON object
  errorMessage: text('error_message'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clubMemberships: many(clubMembers),
  createdClubs: many(clubs),
  organizedEvents: many(events),
  eventAttendances: many(eventAttendees),
  sentMessages: many(messages),
  notifications: many(notifications),
  fileUploads: many(fileUploads),
}));

export const clubsRelations = relations(clubs, ({ one, many }) => ({
  creator: one(users, {
    fields: [clubs.createdBy],
    references: [users.id],
  }),
  members: many(clubMembers),
  events: many(events),
  tournaments: many(tournaments),
}));

export const clubMembersRelations = relations(clubMembers, ({ one }) => ({
  club: one(clubs, {
    fields: [clubMembers.clubId],
    references: [clubs.id],
  }),
  user: one(users, {
    fields: [clubMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [clubMembers.invitedBy],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  club: one(clubs, {
    fields: [events.clubId],
    references: [clubs.id],
  }),
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
  attendees: many(eventAttendees),
  tournaments: many(tournaments),
}));

export const eventAttendeesRelations = relations(eventAttendees, ({ one }) => ({
  event: one(events, {
    fields: [eventAttendees.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventAttendees.userId],
    references: [users.id],
  }),
}));

export const tournamentsRelations = relations(tournaments, ({ one }) => ({
  event: one(events, {
    fields: [tournaments.eventId],
    references: [events.id],
  }),
  club: one(clubs, {
    fields: [tournaments.clubId],
    references: [clubs.id],
  }),
  organizer: one(users, {
    fields: [tournaments.organizerId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
  }),
  replies: many(messages),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const fileUploadsRelations = relations(fileUploads, ({ one }) => ({
  uploader: one(users, {
    fields: [fileUploads.uploadedBy],
    references: [users.id],
  }),
}));