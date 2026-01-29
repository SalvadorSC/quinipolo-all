---
name: supabase-migrations
description: Design and write Supabase/PostgreSQL database migrations. Use when creating or modifying database schema, tables, indexes, or constraints.
---

# Supabase Database Migrations

## Instructions

When creating database migrations for the quinipolo project:

1. **File Location**
   - Migrations: `quinipolo-be/migrations/`
   - Use descriptive names: `create_notification_tables.sql`
   - Include timestamp if multiple migrations exist

2. **Schema Design**
   - Use UUID for primary keys
   - Always include timestamps: `created_at`, `updated_at`
   - Add foreign key constraints with proper references
   - Create indexes for frequently queried columns
   - Use appropriate data types (text, jsonb, boolean, timestamp)

3. **Migration Pattern**
   ```sql
   -- Create table
   CREATE TABLE IF NOT EXISTS table_name (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     field_name TEXT NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Create indexes
   CREATE INDEX idx_table_field ON table_name(field_name);

   -- Add comments
   COMMENT ON TABLE table_name IS 'Description of what this table stores';
   ```

4. **Best Practices**
   - Use `IF NOT EXISTS` to make migrations idempotent
   - Create indexes for foreign keys and frequently filtered columns
   - Use `ON DELETE CASCADE` where appropriate
   - Use `jsonb` for flexible data structures
   - Always include `created_at` timestamps

5. **Common Field Types**
   - IDs: `UUID DEFAULT uuid_generate_v4()`
   - References: `UUID REFERENCES table(id)`
   - Text: `TEXT` (variable length) or `VARCHAR(n)` (limited)
   - JSON: `JSONB` (binary JSON, indexed)
   - Flags: `BOOLEAN DEFAULT false`
   - Times: `TIMESTAMP DEFAULT NOW()`

## Examples

**Notification Tokens Table:**
```sql
CREATE TABLE IF NOT EXISTS notification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  expo_push_token TEXT UNIQUE NOT NULL,
  device_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notification_tokens_user_id ON notification_tokens(user_id);
CREATE INDEX idx_notification_tokens_active ON notification_tokens(is_active);
```

**Notifications History Table:**
```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quinipolo_id UUID REFERENCES quinipolos(id),
  league_id UUID REFERENCES leagues(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read_status BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_status ON notifications(read_status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```
