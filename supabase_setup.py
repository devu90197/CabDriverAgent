"""
Helper script for Supabase integration
Run this script after setting up your Supabase credentials
"""

import os
from dotenv import load_dotenv
import subprocess
import sys

def check_env_variables():
    """Check if Supabase environment variables are set"""
    load_dotenv()
    
    required_vars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"   - {var}")
        print("\nPlease set these variables in your .env file")
        return False
    else:
        print("✅ All required Supabase environment variables are set")
        return True

def seed_database():
    """Run the database seeding script"""
    try:
        print("🌱 Seeding database with sample data...")
        result = subprocess.run([sys.executable, 'seed_supabase.py'], 
                              capture_output=True, text=True, cwd='.')
        if result.returncode == 0:
            print("✅ Database seeding completed successfully")
            print(result.stdout)
            return True
        else:
            print("❌ Database seeding failed")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Error running seed script: {e}")
        return False

def run_schema_migration():
    """Instructions for running schema migration"""
    print("\n📋 To run the schema migration:")
    print("1. Go to your Supabase project dashboard")
    print("2. Navigate to SQL Editor")
    print("3. Copy the contents of 'supabase_schema.sql'")
    print("4. Paste and run the SQL in the editor")
    print("5. The tables will be created automatically")

def main():
    print("🚀 Supabase Setup Helper")
    print("=" * 30)
    
    # Check environment variables
    env_ok = check_env_variables()
    
    if not env_ok:
        print("\n📝 Please create a .env file with your Supabase credentials:")
        print("   SUPABASE_URL=your_supabase_url")
        print("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
        return
    
    # Show setup options
    print("\n🔧 Available actions:")
    print("1. Run schema migration instructions")
    print("2. Seed database with sample data")
    print("3. Both")
    
    choice = input("\nEnter your choice (1/2/3): ").strip()
    
    if choice == "1":
        run_schema_migration()
    elif choice == "2":
        seed_database()
    elif choice == "3":
        run_schema_migration()
        print()
        seed_database()
    else:
        print("Invalid choice")

if __name__ == "__main__":
    main()