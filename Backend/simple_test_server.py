#!/usr/bin/env python3
"""
Simple test server for period attendance endpoints
"""

from flask import Flask, jsonify, request, Response
import period_attendance as period_db
from datetime import datetime

app = Flask(__name__)

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/api/period-attendance', methods=['GET'])
def get_period_attendance():
    try:
        date_str = request.args.get('date')
        period = request.args.get('period')
        
        records = period_db.get_period_attendance(date_str, period)
        
        attendance_records = []
        for record in records:
            attendance_records.append({
                "id": record[0],
                "studentId": record[1],
                "name": record[2],
                "date": record[3],
                "period": record[4],
                "time": record[5],
                "emotion": record[6],
                "spoofingStatus": record[7],
                "livenessConfidence": record[8],
                "recognitionConfidence": record[9],
                "timestamp": record[10]
            })
        
        return jsonify({
            "success": True,
            "data": attendance_records,
            "total": len(attendance_records)
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Failed to get period attendance: {str(e)}"
        }), 500

@app.route('/api/period-attendance/summary', methods=['GET'])
def get_period_attendance_summary():
    try:
        date_str = request.args.get('date')
        
        records = period_db.get_attendance_summary(date_str)
        
        summary = []
        for record in records:
            summary.append({
                "period": record[0],
                "totalPresent": record[1],
                "liveCount": record[2],
                "spoofedCount": record[3]
            })
        
        return jsonify({
            "success": True,
            "data": summary
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Failed to get attendance summary: {str(e)}"
        }), 500

@app.route('/api/period-attendance/export', methods=['GET'])
def export_period_attendance():
    try:
        date_str = request.args.get('date')
        period = request.args.get('period')
        
        csv_content = period_db.export_period_attendance_csv(date_str, period)
        
        if csv_content is None:
            return jsonify({
                "success": False,
                "message": "Failed to generate CSV"
            }), 500
        
        # Generate filename
        filename_parts = ["period_attendance"]
        if date_str:
            filename_parts.append(date_str)
        if period:
            filename_parts.append(period.replace(" ", "_").replace("(", "").replace(")", ""))
        filename = "_".join(filename_parts) + ".csv"
        
        return Response(
            csv_content,
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename={filename}'}
        )
        
    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"Failed to export attendance: {str(e)}"
        }), 500

if __name__ == '__main__':
    print("🧪 Starting Simple Test Server for Period Attendance")
    print("📡 Available endpoints:")
    print("- GET /api/period-attendance")
    print("- GET /api/period-attendance/summary") 
    print("- GET /api/period-attendance/export")
    print("🔗 Server running at: http://localhost:5001")
    
    app.run(host='0.0.0.0', port=5001, debug=True)