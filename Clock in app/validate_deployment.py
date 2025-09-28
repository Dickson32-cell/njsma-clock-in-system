#!/usr/bin/env python3
"""
Vercel Deployment Validation Script
Run this to check if your project is ready for deployment
"""

import os
import sys
from pathlib import Path

def check_file_exists(filepath, required=True):
    """Check if file exists and report status"""
    if os.path.exists(filepath):
        print(f"✅ {filepath} - EXISTS")
        return True
    else:
        status = "❌ MISSING (REQUIRED)" if required else "⚠️  MISSING (OPTIONAL)"
        print(f"{status} {filepath}")
        return not required

def check_vercel_setup():
    """Validate Vercel deployment setup"""
    print("🔍 Checking Vercel Deployment Setup...\n")
    
    all_good = True
    
    # Required files
    required_files = [
        "vercel.json",
        "requirements.txt", 
        "runtime.txt",
        "api/app.py",
        "clock-in-system/index.html"
    ]
    
    for file in required_files:
        if not check_file_exists(file):
            all_good = False
    
    # Check vercel.json structure
    if os.path.exists("vercel.json"):
        try:
            import json
            with open("vercel.json", "r") as f:
                config = json.load(f)
                if "builds" in config and "routes" in config:
                    print("✅ vercel.json - Valid structure")
                else:
                    print("❌ vercel.json - Invalid structure")
                    all_good = False
        except json.JSONDecodeError:
            print("❌ vercel.json - Invalid JSON")
            all_good = False
    
    # Check if Flask app imports successfully
    try:
        sys.path.append(os.path.dirname(__file__))
        import api.app
        print("✅ api/app.py - Imports successfully")
    except ImportError as e:
        print(f"❌ api/app.py - Import error: {e}")
        all_good = False
    
    print("\n" + "="*50)
    if all_good:
        print("🎉 SUCCESS: Your project is ready for Vercel deployment!")
        print("\nNext steps:")
        print("1. Push to GitHub")
        print("2. Connect to Vercel") 
        print("3. Deploy!")
    else:
        print("⚠️  WARNING: Some issues need to be fixed before deployment")
    
    return all_good

if __name__ == "__main__":
    check_vercel_setup()