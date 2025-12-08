#!/bin/bash

echo "🚀 Starting Period Attendance Server"
echo "=================================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

# Check if Flask is installed
python3 -c "import flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 Installing Flask..."
    pip3 install flask
fi

echo "🔧 Setting up period attendance database..."
python3 -c "import period_attendance as period_db; period_db.setup_period_attendance_database(); print('✅ Database ready')"

echo "🌐 Starting server on http://localhost:5001"
echo "📡 Available endpoints:"
echo "   - GET /api/period-attendance"
echo "   - GET /api/period-attendance/summary"
echo "   - GET /api/period-attendance/export"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="

python3 simple_test_server.py