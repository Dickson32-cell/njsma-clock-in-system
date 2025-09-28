# Quick Deployment Fix for NJSMA Clock-In System

## The Issue
Render is trying to use Poetry instead of pip, causing the build to fail.

## Immediate Solution

### Step 1: Delete Poetry Files (if any exist)
Look for and delete these files in your repository root:
- `pyproject.toml`  
- `poetry.lock`
- `poetry.toml`

### Step 2: Render Configuration
In your Render dashboard, manually set these build settings:

**Build Command:** `pip install -r requirements.txt`
**Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120 --workers 1`

### Step 3: Environment Variables
Set these in Render dashboard:
- `FLASK_ENV` = `production`
- `PYTHON_VERSION` = `3.12.6`

### Step 4: Force Pip Usage
If Render still tries to use Poetry, add this to your repository root:

**.buildpacks** file content:
```
https://github.com/heroku/heroku-buildpack-python.git
```

## Files Currently Ready ✅

✅ `app.py` - Main Flask application at root
✅ `requirements.txt` - Dependencies at root  
✅ `runtime.txt` - Python 3.12.6 specified
✅ `Procfile` - Gunicorn configuration
✅ `clock-in-system/` - Frontend files
✅ `instance/` - Database directory

## Manual Render Setup Steps

1. Go to Render Dashboard
2. Create New Web Service
3. Connect GitHub Repository
4. **Important:** In "Advanced" settings:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120 --workers 1`
   - Auto-Deploy: Yes

This bypasses Poetry and forces Render to use pip with your requirements.txt file.