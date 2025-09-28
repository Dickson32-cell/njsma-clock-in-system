from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from sqlalchemy import text
from datetime import datetime, date
import os
import json

# Initialize Flask app
app = Flask(__name__)

# Enable CORS for all domains on all routes
CORS(app)

# Database configuration
database_url = os.environ.get('DATABASE_URL')
if database_url:
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///clock_in_system.db'

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Models
class Employee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100))
    email = db.Column(db.String(100))
    contact = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    date_added = db.Column(db.DateTime, default=datetime.utcnow)
    date_modified = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AttendanceLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    clock_in_time = db.Column(db.DateTime, nullable=False)
    clock_out_time = db.Column(db.DateTime)
    status = db.Column(db.String(20), default="present")
    location = db.Column(db.String(100), default="EN-010-4770")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    date_only = db.Column(db.Date, nullable=False)

    def __init__(self, employee_id, clock_in_time, **kwargs):
        super(AttendanceLog, self).__init__(**kwargs)
        self.employee_id = employee_id
        self.clock_in_time = clock_in_time
        self.date_only = clock_in_time.date()

class LeaveRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(20), db.ForeignKey('employee.employee_id'), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default="Pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Initialize database
with app.app_context():
    db.create_all()
    
    # Check and add new columns if they don't exist (migration)
    try:
        # Try to access a new column to see if it exists
        Employee.query.filter_by(department=None).first()
    except Exception:
        # If the column doesn't exist, add it using raw SQL
        with db.engine.connect() as conn:
            try:
                conn.execute(text("ALTER TABLE employee ADD COLUMN department VARCHAR(100)"))
                conn.commit()
            except:
                pass
            try:
                conn.execute(text("ALTER TABLE employee ADD COLUMN email VARCHAR(100)"))
                conn.commit()
            except:
                pass
            try:
                conn.execute(text("ALTER TABLE employee ADD COLUMN contact VARCHAR(20)"))
                conn.commit()
            except:
                pass
            try:
                conn.execute(text("ALTER TABLE employee ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                conn.commit()
            except:
                pass
            try:
                conn.execute(text("ALTER TABLE employee ADD COLUMN date_modified DATETIME DEFAULT CURRENT_TIMESTAMP"))
                conn.commit()
            except:
                pass

# Static file serving
@app.route('/')
def index():
    try:
        with open('clock-in-system/index.html', 'r', encoding='utf-8') as f:
            content = f.read()
        return content, 200, {'Content-Type': 'text/html'}
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route('/<path:filename>')
def serve_static(filename):
    try:
        # Handle CSS files
        if filename.endswith('.css'):
            file_path = f'clock-in-system/{filename}'
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return content, 200, {'Content-Type': 'text/css'}
        
        # Handle JS files
        elif filename.endswith('.js'):
            file_path = f'clock-in-system/{filename}'
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return content, 200, {'Content-Type': 'application/javascript'}
        
        # Handle HTML files
        elif filename.endswith('.html'):
            file_path = f'clock-in-system/{filename}'
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return content, 200, {'Content-Type': 'text/html'}
        
        # Handle PNG files
        elif filename.endswith('.png'):
            file_path = f'clock-in-system/{filename}'
            with open(file_path, 'rb') as f:
                content = f.read()
            return content, 200, {'Content-Type': 'image/png'}
        
        else:
            return jsonify({"error": "File not found"}), 404
            
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

# API Routes
@app.route('/api/clock-in', methods=['POST'])
def clock_in():
    data = request.get_json()
    employee_id = data.get('employeeId') if data else None

    if not employee_id:
        return jsonify({"error": "Employee ID is required"}), 400

    employee = Employee.query.filter_by(employee_id=employee_id).first()
    if not employee:
        return jsonify({"error": "Employee not found"}), 404

    # Check if already clocked in today
    today = date.today()
    existing_log = AttendanceLog.query.filter_by(
        employee_id=employee_id,
        date_only=today
    ).first()

    if existing_log:
        return jsonify({"error": "Already clocked in today"}), 400

    # Create new attendance log
    now = datetime.utcnow()
    attendance_log = AttendanceLog(
        employee_id=employee_id,
        clock_in_time=now,
        status="present"
    )

    db.session.add(attendance_log)
    db.session.commit()

    return jsonify({
        "message": f"Clock-in successful for {employee.name}",
        "clock_in_time": now.strftime("%Y-%m-%d %H:%M:%S"),
        "status": "present"
    }), 200

@app.route('/api/clock-out', methods=['POST'])
def clock_out():
    data = request.get_json()
    employee_id = data.get('employeeId') if data else None

    if not employee_id:
        return jsonify({"error": "Employee ID is required"}), 400

    # Find today's attendance log
    today = date.today()
    attendance_log = AttendanceLog.query.filter_by(
        employee_id=employee_id,
        date_only=today
    ).first()

    if not attendance_log:
        return jsonify({"error": "No clock-in record found for today"}), 400

    if attendance_log.clock_out_time:
        return jsonify({"error": "Already clocked out today"}), 400

    # Update clock out time
    now = datetime.utcnow()
    attendance_log.clock_out_time = now
    db.session.commit()

    return jsonify({
        "message": "Clock-out successful",
        "clock_out_time": now.strftime("%Y-%m-%d %H:%M:%S")
    }), 200

@app.route('/api/status/<employee_id>', methods=['GET'])
def get_status(employee_id):
    # Find today's attendance log
    today = date.today()
    attendance_log = AttendanceLog.query.filter_by(
        employee_id=employee_id,
        date_only=today
    ).first()

    if not attendance_log:
        return jsonify({"status": "not_clocked_in"}), 200

    status = {
        "status": "clocked_in" if not attendance_log.clock_out_time else "clocked_out",
        "clock_in_time": attendance_log.clock_in_time.strftime("%Y-%m-%d %H:%M:%S"),
        "clock_out_time": attendance_log.clock_out_time.strftime("%Y-%m-%d %H:%M:%S") if attendance_log.clock_out_time else None
    }

    return jsonify(status), 200

@app.route('/api/leave-request', methods=['POST'])
def submit_leave_request():
    data = request.get_json()
    employee_id = data.get('employeeId') if data else None
    start_date = data.get('startDate') if data else None
    end_date = data.get('endDate') if data else None

    if not employee_id or not start_date or not end_date:
        return jsonify({"error": "Missing required fields"}), 400

    employee = Employee.query.filter_by(employee_id=employee_id).first()
    if not employee:
        return jsonify({"error": "Employee not found"}), 404

    try:
        # Create leave request using positional arguments to avoid constructor issues
        leave_request = LeaveRequest()
        leave_request.employee_id = employee_id
        leave_request.start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
        leave_request.end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
        
        db.session.add(leave_request)
        db.session.commit()

        return jsonify({
            "message": f"Leave request submitted successfully for {employee.name}",
            "request_id": leave_request.id
        }), 201

    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400
    except Exception as e:
        return jsonify({"error": "An error occurred processing your request"}), 500

@app.route('/api/leave-requests', methods=['GET'])
def get_leave_requests():
    try:
        requests = db.session.query(LeaveRequest, Employee).join(Employee).all()
        result = [
            {
                "id": req.id,
                "employee_id": req.employee_id,
                "employee_name": employee.name,
                "start_date": req.start_date.strftime("%Y-%m-%d"),
                "end_date": req.end_date.strftime("%Y-%m-%d"),
                "status": req.status,
                "created_at": req.created_at.strftime("%Y-%m-%d")
            } for req, employee in requests
        ]
        return jsonify(result), 200
    except Exception:
        return jsonify({"error": "An error occurred fetching leave requests"}), 500

@app.route('/api/staff', methods=['POST'])
def add_staff():
    data = request.get_json()
    staff_list = data.get('staff', []) if data else []

    if not staff_list:
        return jsonify({"error": "No staff data provided"}), 400

    try:
        added_count = 0
        for staff in staff_list:
            employee_id = staff.get('staffId')
            name = staff.get('name')

            if not employee_id or not name:
                continue

            # Check if employee already exists
            existing = Employee.query.filter_by(employee_id=employee_id).first()
            if not existing:
                # Create employee using attribute assignment to avoid constructor issues
                new_employee = Employee()
                new_employee.employee_id = employee_id
                new_employee.name = name
                new_employee.department = staff.get('department', '')
                new_employee.email = staff.get('email', '')
                new_employee.contact = staff.get('contact', '')
                new_employee.is_active = staff.get('is_active', True)
                db.session.add(new_employee)
                added_count += 1

        db.session.commit()
        return jsonify({
            "message": f"Successfully added {added_count} staff members",
            "added_count": added_count
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({"error": "An error occurred adding staff"}), 500

@app.route('/api/staff', methods=['GET'])
def get_staff():
    try:
        staff = Employee.query.all()
        result = [
            {
                "id": emp.id,
                "employee_id": emp.employee_id,
                "name": emp.name,
                "department": emp.department,
                "email": emp.email,
                "contact": emp.contact,
                "is_active": emp.is_active,
                "date_added": emp.date_added.strftime("%Y-%m-%d"),
                "date_modified": emp.date_modified.strftime("%Y-%m-%d") if emp.date_modified else emp.date_added.strftime("%Y-%m-%d")
            } for emp in staff
        ]
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": f"An error occurred fetching staff data: {str(e)}"}), 500

@app.route('/api/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    """Get real-time dashboard statistics for HR"""
    try:
        today = date.today()

        # Total employees
        total_employees = Employee.query.count()

        # Present today (employees who clocked in today)
        attendance_subquery = db.session.query(AttendanceLog).filter(
            AttendanceLog.date_only == today,
            AttendanceLog.status.in_(['present', 'late'])
        ).subquery()
        
        present_today = db.session.query(attendance_subquery.c.employee_id).distinct().count()

        # On leave today (approved leave requests that cover today)
        on_leave_today = LeaveRequest.query.filter(
            LeaveRequest.start_date <= today,
            LeaveRequest.end_date >= today,
            LeaveRequest.status == 'approved'
        ).count()

        # Late arrivals today
        late_arrivals = AttendanceLog.query.filter(
            AttendanceLog.date_only == today,
            AttendanceLog.status == 'late'
        ).count()

        # Absent today (employees who should be working but didn't clock in)
        total_expected = total_employees - on_leave_today
        absent_today = max(0, total_expected - present_today)

        result = {
            "total_employees": total_employees,
            "present_today": present_today,
            "on_leave_today": on_leave_today,
            "late_arrivals": late_arrivals,
            "absent_today": absent_today,
            "expected_today": total_expected
        }

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred fetching dashboard stats: {str(e)}"}), 500

@app.route('/api/staff/<employee_id>', methods=['PUT'])
def update_staff(employee_id):
    """Update staff member information"""
    try:
        staff = Employee.query.filter_by(employee_id=employee_id).first()
        if not staff:
            return jsonify({"error": "Staff member not found"}), 404
        
        data = request.get_json()
        
        # Update staff information
        if 'name' in data:
            staff.name = data['name']
        if 'department' in data:
            staff.department = data['department']
        if 'email' in data:
            staff.email = data['email']
        if 'contact' in data:
            staff.contact = data['contact']
        if 'is_active' in data:
            staff.is_active = data['is_active']
        
        staff.date_modified = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Staff member updated successfully",
            "staff": {
                "id": staff.id,
                "employee_id": staff.employee_id,
                "name": staff.name,
                "department": getattr(staff, 'department', None),
                "email": getattr(staff, 'email', None),
                "contact": getattr(staff, 'contact', None),
                "is_active": getattr(staff, 'is_active', True),
                "date_modified": staff.date_modified.isoformat() if hasattr(staff, 'date_modified') else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update staff: {str(e)}"}), 500

@app.route('/api/staff/<employee_id>', methods=['DELETE'])
def delete_staff(employee_id):
    """Delete individual staff member"""
    try:
        staff = Employee.query.filter_by(employee_id=employee_id).first()
        if not staff:
            return jsonify({"error": "Staff member not found"}), 404
        
        # Delete related attendance logs
        AttendanceLog.query.filter_by(employee_id=employee_id).delete()
        
        # Delete related leave requests  
        LeaveRequest.query.filter_by(employee_id=employee_id).delete()
        
        # Delete the staff member
        db.session.delete(staff)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": f"Staff member {staff.name} deleted successfully"
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete staff: {str(e)}"}), 500

@app.route('/api/staff/delete_all', methods=['DELETE'])
def delete_all_staff():
    """Delete all staff data permanently"""
    try:
        # Count staff before deletion
        deleted_count = Employee.query.count()
        
        # First, delete all related attendance logs
        AttendanceLog.query.delete()
        
        # Delete all leave requests
        LeaveRequest.query.delete()
        
        # Finally, delete all employees
        Employee.query.delete()
        
        # Commit all deletions
        db.session.commit()
        
        return jsonify({
            "success": True, 
            "message": f"Successfully deleted all {deleted_count} staff members and related data",
            "deleted_count": deleted_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete all staff data: {str(e)}"}), 500

# This is the entry point for Vercel
if __name__ == "__main__":
    app.run(debug=False)