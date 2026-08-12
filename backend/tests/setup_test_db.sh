#!/usr/bin/env bash
# =====================================================================
# SmartSched AI — Test Database Setup
#
# Creates a completely separate `smartsched_ai_test` database (never
# the dev `smartsched_ai` one — see tests/conftest.py for how that
# isolation is enforced at the app-config level too) and seeds it with
# the exact same schema, seed data, and demo credentials the dev setup
# uses, so the test suite's assumptions (admin@college.edu / Admin@123,
# jsmith@college.edu / Faculty@123 both existing) hold.
#
# Safe to re-run: drops and recreates the test database every time,
# so tests always start from a known, clean state.
# =====================================================================
set -euo pipefail

cd "$(dirname "$0")/../.."   # repo root (backend/tests/../.. )

echo "Dropping and recreating smartsched_ai_test..."
mysql -u root -e "DROP DATABASE IF EXISTS smartsched_ai_test;"
mysql -u root -e "CREATE DATABASE smartsched_ai_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

echo "Applying schema..."
sed 's/smartsched_ai/smartsched_ai_test/g' database/schema/001_create_tables.sql | mysql -u root

echo "Applying seed data..."
sed 's/smartsched_ai/smartsched_ai_test/g' database/seed/seed_data.sql | mysql -u root
sed 's/smartsched_ai/smartsched_ai_test/g' database/seed/002_assignments.sql | mysql -u root

echo "Granting the app user access to the test database..."
mysql -u root -e "
CREATE USER IF NOT EXISTS 'smartsched_app'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'SmartSched@2026';
GRANT ALL PRIVILEGES ON smartsched_ai_test.* TO 'smartsched_app'@'127.0.0.1';
FLUSH PRIVILEGES;
"

echo "Setting real bcrypt password hashes for the demo accounts tests log in as..."
cd backend
venv/bin/python -c "
import bcrypt, subprocess
creds = {'admin@college.edu': 'Admin@123', 'jsmith@college.edu': 'Faculty@123', 'arao@college.edu': 'Faculty@123'}
for email, pw in creds.items():
    h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    subprocess.run(['mysql', '-u', 'root', 'smartsched_ai_test', '-e',
                     f\"UPDATE users SET password_hash='{h}' WHERE email='{email}';\"], check=True)
print('Test database ready: smartsched_ai_test')
"
