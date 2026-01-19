#!/bin/bash
set -e

echo "=== KGC Horilla Startup ==="

echo "Waiting for database..."
while ! python3 manage.py showmigrations > /dev/null 2>&1; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Running migrations..."
python3 manage.py makemigrations --noinput || true
python3 manage.py migrate --noinput

echo "Collecting static files..."
python3 manage.py collectstatic --noinput

echo "Creating admin user if not exists..."
python3 manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@kgc.local', 'admin')
    print('Admin user created')
else:
    print('Admin user already exists')
" || echo "User creation skipped"

echo "Starting Gunicorn server..."
exec gunicorn --bind 0.0.0.0:8000 --workers 2 --timeout 120 horilla.wsgi:application
