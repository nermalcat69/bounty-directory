import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Enums
export const planEnum = pgEnum("plan", ["standard", "featured", "premium"]);
export const workplaceEnum = pgEnum("workplace", ["On site", "Remote", "Hybrid"]);

// Users table - Better Auth compatible
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  slug: text("slug"),
  hero: text("hero"),
  status: text("status"),
  bio: text("bio"),
  work: text("work"),
  website: text("website"),
  socialXLink: text("social_x_link"),
  public: boolean("public"),
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
  ownerId: text("owner_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Posts table
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  url: text("url"),
  userId: text("user_id").references(() => users.id).notNull(),
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

// MCPs table
export const mcps = pgTable("mcps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).unique().notNull(),
  description: text("description"),
  repository: text("repository"),
  npmPackage: text("npm_package"),
  companyId: uuid("company_id").references(() => companies.id),
  plan: planEnum("plan").default("standard"),
  active: boolean("active").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Follow functionality removed - followers table deleted

// Votes table
export const votes = pgTable("votes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id).notNull(),
  postId: uuid("post_id").references(() => posts.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Avatars table (for file storage)
export const avatars = pgTable("avatars", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bounty Directory Tables
export const issues = pgTable("issues", {
  id: text("id").primaryKey(), // GitHub issue ID as string
  repo: text("repo").notNull(),
  number: integer("number").notNull(),
  title: text("title"),
  body: text("body"),
  html_url: text("html_url"),
  user_login: text("user_login"),
  created_at: timestamp("created_at"),
  updated_at: timestamp("updated_at"),
  labels: text("labels"), // JSON string of labels
  raw: text("raw"), // JSON string of raw GitHub data
  first_seen: timestamp("first_seen").defaultNow(),
  last_notified: timestamp("last_notified"),
  comments: integer("comments").default(0),
  state: text("state").default("open"),
  assignee: text("assignee"),
  language: text("language"),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: text("user_id").references(() => users.id),
  repo: text("repo"), // either a repo (owner/repo) OR null for global
  query: text("query"), // search query for filtering
  delivery_method: text("delivery_method").notNull(), // 'discord', 'webhook', 'email'
  destination: text("destination").notNull(), // webhook URL or discord webhook or email
  active: boolean("active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  issue_id: text("issue_id").references(() => issues.id),
  alert_id: uuid("alert_id").references(() => alerts.id),
  sent_at: timestamp("sent_at").defaultNow(),
  delivery_method: text("delivery_method").notNull(),
  status: text("status").default("pending"), // 'pending', 'sent', 'failed'
  error_message: text("error_message"),
});

// Better Auth tables
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  companies: many(companies),
  votes: many(votes),
  sessions: many(session),
  accounts: many(account),
  alerts: many(alerts),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  jobs: many(jobs),
  mcps: many(mcps),
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

export const mcpsRelations = relations(mcps, ({ one }) => ({
  company: one(companies, {
    fields: [mcps.companyId],
    references: [companies.id],
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

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(users, {
    fields: [session.userId],
    references: [users.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(users, {
    fields: [account.userId],
    references: [users.id],
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
  issue: one(issues, {
    fields: [notifications.issue_id],
    references: [issues.id],
  }),
  alert: one(alerts, {
    fields: [notifications.alert_id],
    references: [alerts.id],
  }),
}));