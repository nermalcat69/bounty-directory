import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Enums
export const planEnum = pgEnum("plan", ["standard", "featured", "premium"]);
export const workplaceEnum = pgEnum("workplace", ["On site", "Remote", "Hybrid"]);
export const projectTypeEnum = pgEnum("project_type", ["Web Development", "Mobile App", "Desktop App", "API Development", "Database Design", "UI/UX Design", "DevOps", "Data Analysis", "Machine Learning", "Other"]);
export const urgencyEnum = pgEnum("urgency", ["Low", "Medium", "High", "Urgent"]);
export const budgetRangeEnum = pgEnum("budget_range", ["Under $500", "$500-$1000", "$1000-$2500", "$2500-$5000", "$5000-$10000", "$10000+"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "canceled", "past_due", "incomplete", "trialing"]);

// Users table - Better Auth compatible
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  hero: text("hero"),
  status: varchar("status", { length: 255 }),
  bio: text("bio"),
  work: varchar("work", { length: 255 }),
  website: text("website"),
  slug: varchar("slug", { length: 255 }),
  socialXLink: text("social_x_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  public: boolean("public").default(false),
  followEmail: boolean("follow_email").default(false),
  followerCount: integer("follower_count").default(0),
  followingCount: integer("following_count").default(0),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Companies table
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  website: text("website"),
  image: text("image"),
  hero: text("hero"),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Posts table
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  url: text("url"),
  userId: uuid("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Jobs table
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description").notNull(),
  link: text("link").notNull(),
  workplace: workplaceEnum("workplace").notNull(),
  experience: varchar("experience", { length: 255 }),
  plan: planEnum("plan").default("standard"),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Freelance table
export const freelance = pgTable("freelance", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  location: varchar("location", { length: 255 }),
  description: text("description").notNull(),
  link: text("link"),
  workplace: workplaceEnum("workplace").notNull(),
  experience: varchar("experience", { length: 255 }),
  projectType: projectTypeEnum("project_type").notNull(),
  budgetRange: budgetRangeEnum("budget_range").notNull(),
  duration: varchar("duration", { length: 100 }), // e.g., "2-4 weeks", "1-3 months"
  skills: text("skills"), // Comma-separated skills
  urgency: urgencyEnum("urgency").default("Medium"),
  contactEmail: varchar("contact_email", { length: 255 }),
  plan: planEnum("plan").default("standard"),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});



// Follow functionality removed - followers table deleted

// Votes table
export const votes = pgTable("votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  postId: uuid("post_id").references(() => posts.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});



// Bounty Directory Tables


export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id),
  repo: text("repo"), // either a repo (owner/repo) OR null for global
  query: text("query"), // search query for filtering
  delivery_method: text("delivery_method").notNull(), // 'discord', 'webhook', 'email'
  destination: text("destination").notNull(), // webhook URL or discord webhook or email
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

// Issues table for notification system
export const issues = pgTable("issues", {
  id: text("id").primaryKey(), // GitHub issue ID as string
  title: text("title").notNull(),
  body: text("body"),
  html_url: text("html_url").notNull(),
  user_login: text("user_login").notNull(),
  user_avatar_url: text("user_avatar_url"),
  repo: text("repo").notNull(), // owner/repo format
  labels: text("labels"), // JSON string of labels
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  // Index for efficient queries by repo
  repoIdx: index("issues_repo_idx").on(table.repo),
  // Index for efficient queries by creation date
  createdAtIdx: index("issues_created_at_idx").on(table.created_at),
}));

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  issue_id: text("issue_id").notNull(), // GitHub issue ID as string (no foreign key)
  alert_id: uuid("alert_id").references(() => alerts.id).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  sent_at: timestamp("sent_at"),
  delivery_method: text("delivery_method").notNull(), // 'discord', 'webhook', 'email'
  status: text("status").default("pending").notNull(), // 'pending', 'sent', 'failed', 'retrying'
  delivered: boolean("delivered").default(false).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  error_message: text("error_message"),
  response_data: text("response_data"), // JSON string of delivery response for audit
}, (table) => ({
  // Unique constraint to prevent duplicate notifications for same alert+issue
  uniqueAlertIssue: unique("unique_alert_issue").on(table.alert_id, table.issue_id),
  // Index for efficient queries
  statusIdx: index("notifications_status_idx").on(table.status),
  createdAtIdx: index("notifications_created_at_idx").on(table.created_at),
}));

// Subscriptions table for alert subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => users.id).notNull(),
  plan_type: text("plan_type").notNull().default("alerts_monthly"), // alerts_monthly for $3/month
  status: subscriptionStatusEnum("status").notNull().default("incomplete"),
  polar_subscription_id: text("polar_subscription_id").unique(),
  polar_customer_id: text("polar_customer_id"),
  current_period_start: timestamp("current_period_start"),
  current_period_end: timestamp("current_period_end"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

// Fetch metadata table for persistent storage (replaces Redis)
export const fetchMetadata = pgTable("fetch_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value"),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
}, (table) => ({
  keyIdx: index("fetch_metadata_key_idx").on(table.key),
  expiresAtIdx: index("fetch_metadata_expires_at_idx").on(table.expires_at),
}));

// Better Auth tables
// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  companies: many(companies),
  votes: many(votes),
  alerts: many(alerts),
  freelance: many(freelance),
  subscriptions: many(subscriptions),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  jobs: many(jobs),
  freelance: many(freelance),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  votes: many(votes),
}));

export const jobsRelations = relations(jobs, ({ one }) => ({
  company: one(companies, {
    fields: [jobs.companyId],
    references: [companies.id],
  }),
}));

export const freelanceRelations = relations(freelance, ({ one }) => ({
  company: one(companies, {
    fields: [freelance.companyId],
    references: [companies.id],
  }),
  owner: one(users, {
    fields: [freelance.ownerId],
    references: [users.id],
  }),
}));



// Follow functionality removed - followersRelations deleted

export const votesRelations = relations(votes, ({ one }) => ({
  user: one(users, {
    fields: [votes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [votes.postId],
    references: [posts.id],
  }),
}));

export const issuesRelations = relations(issues, ({ many }) => ({
  notifications: many(notifications),
}));

export const alertsRelations = relations(alerts, ({ one, many }) => ({
  user: one(users, {
    fields: [alerts.user_id],
    references: [users.id],
  }),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  alert: one(alerts, {
    fields: [notifications.alert_id],
    references: [alerts.id],
  }),
  issue: one(issues, {
    fields: [notifications.issue_id],
    references: [issues.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.user_id],
    references: [users.id],
  }),
}));