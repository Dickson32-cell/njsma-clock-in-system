# Database Migration Guide

## Issue
The enhanced HR management system requires new database columns that don't exist in the current production database. This causes the application to fail with:
```
psycopg.errors.UndefinedColumn: column employee.department does not exist
```

## Automatic Migration
The updated `app.py` now includes automatic migration logic that will:
1. Check if the new columns exist
2. Add missing columns using safe SQL statements
3. Set appropriate default values
4. Handle errors gracefully

## Manual Migration (if needed)
If you prefer to run the migration manually before deploying:

### Option 1: Using the Migration Script
```bash
# Set your database URL
export DATABASE_URL="your_postgresql_connection_string"

# Run the migration script
python migrate_database.py
```

### Option 2: Direct SQL Commands
Connect to your PostgreSQL database and run:

```sql
-- Add department column
ALTER TABLE employee ADD COLUMN IF NOT EXISTS department VARCHAR(100) DEFAULT 'General';

-- Add email column
ALTER TABLE employee ADD COLUMN IF NOT EXISTS email VARCHAR(120);

-- Add contact column
ALTER TABLE employee ADD COLUMN IF NOT EXISTS contact VARCHAR(20);

-- Add date_modified column
ALTER TABLE employee ADD COLUMN IF NOT EXISTS date_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add is_active column
ALTER TABLE employee ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Verify the migration
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'employee' 
AND column_name IN ('department', 'email', 'contact', 'date_modified', 'is_active')
ORDER BY column_name;
```

## New Database Schema
After migration, the `employee` table will have these additional columns:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| department | VARCHAR(100) | 'General' | Employee's department/unit |
| email | VARCHAR(120) | NULL | Employee's email address |
| contact | VARCHAR(20) | NULL | Employee's phone number |
| date_modified | TIMESTAMP | CURRENT_TIMESTAMP | Last modification date |
| is_active | BOOLEAN | TRUE | Whether employee is active |

## Enhanced Features Enabled
With these columns, the system now supports:

1. **5-Column Staff Data Format**: Name, Staff ID, Department, Email, Contact
2. **Departmental Management**: Filter and manage staff by department
3. **Email Notifications**: Send clock-in reminders via email
4. **Staff Analytics**: Track additions, modifications, and transfers
5. **Enhanced Reporting**: Generate departmental attendance reports

## Deployment Steps
1. The application will automatically handle the migration on startup
2. Monitor the logs for migration success messages
3. Test the enhanced HR management features
4. Upload staff data using the new 5-column format

## Troubleshooting
- If migration fails, use the manual migration options
- Check PostgreSQL logs for specific error details
- Ensure database user has ALTER TABLE permissions
- Verify DATABASE_URL is correctly set in production environment