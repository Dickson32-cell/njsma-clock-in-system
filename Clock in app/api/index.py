from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
import os
import json

# Initialize Flask app
app = Flask(__name__)

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
    date_added = db.Column(db.DateTime, default=datetime.utcnow)

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

def handler(request):
    """Main handler for Vercel serverless function"""
    # Extract path and method from request
    path = getattr(request, 'path', '/')
    method = getattr(request, 'method', 'GET')
    
    # Handle static files
    if path.endswith(('.html', '.css', '.js', '.png')):
        return serve_static_file(path)
    
    # Handle root path
    if path == '/' or path == '':
        return serve_static_file('/index.html')
    
    # Handle API routes within Flask app context
    with app.app_context():
        if path == '/api/clock-in' and method == 'POST':
            return handle_clock_in(request)
        elif path == '/api/clock-out' and method == 'POST':
            return handle_clock_out(request)
        elif path.startswith('/api/status/') and method == 'GET':
            employee_id = path.split('/')[-1]
            return handle_status(employee_id)
        elif path == '/api/staff' and method == 'GET':
            return handle_get_staff()
        elif path == '/api/staff' and method == 'POST':
            return handle_add_staff(request)
        elif path == '/api/dashboard-stats' and method == 'GET':
            return handle_dashboard_stats()
        elif path == '/api/leave-requests' and method == 'GET':
            return handle_get_leave_requests()
        elif path == '/api/leave-request' and method == 'POST':
            return handle_leave_request(request)
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Not found', 'path': path, 'method': method})
            }

def serve_static_file(path):
    """Serve static files"""
    try:
        # Get base path (parent directory of api folder)
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        if path == '/' or path == '' or path == '/index.html':
            file_path = os.path.join(base_path, 'clock-in-system', 'index.html')
        else:
            file_path = os.path.join(base_path, 'clock-in-system', path.lstrip('/'))
        
        if os.path.exists(file_path):
            # Determine content type
            content_type = 'text/html'
            if path.endswith('.css'):
                content_type = 'text/css'
            elif path.endswith('.js'):
                content_type = 'application/javascript'
            elif path.endswith('.png'):
                content_type = 'image/png'
            
            # Handle binary files
            if content_type.startswith('image/'):
                with open(file_path, 'rb') as f:
                    import base64
                    content = base64.b64encode(f.read()).decode('utf-8')
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': content_type},
                        'body': content,
                        'isBase64Encoded': True
                    }
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': content_type},
                        'body': content
                    }
        else:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'File not found', 'path': file_path})
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Error serving file: {str(e)}'})
        }

def get_json_body(request):
    """Extract JSON from request body"""
    try:
        if hasattr(request, 'get_json'):
            return request.get_json() or {}
        elif hasattr(request, 'json'):
            return request.json or {}
        elif hasattr(request, 'body'):
            body = request.body
            if isinstance(body, bytes):
                body = body.decode('utf-8')
            return json.loads(body) if body else {}
        return {}
    except:
        return {}

def handle_clock_in(request):
    """Handle clock in"""
    try:
        data = get_json_body(request)
        employee_id = data.get('employee_id')
        
        if not employee_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Employee ID required'})
            }
        
        # Check if employee exists
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if not employee:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Employee not found'})
            }
        
        # Check if already clocked in today
        today = date.today()
        existing = AttendanceLog.query.filter_by(
            employee_id=employee_id,
            date_only=today,
            clock_out_time=None
        ).first()
        
        if existing:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Already clocked in today'})
            }
        
        # Create new log
        now = datetime.now()
        log = AttendanceLog(employee_id=employee_id, clock_in_time=now)
        db.session.add(log)
        db.session.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'message': 'Clocked in successfully', 'time': now.isoformat()})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }

def handle_clock_out(request):
    """Handle clock out"""
    try:
        data = get_json_body(request)
        employee_id = data.get('employee_id')
        
        if not employee_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Employee ID required'})
            }
        
        # Find today's log
        today = date.today()
        log = AttendanceLog.query.filter_by(
            employee_id=employee_id,
            date_only=today,
            clock_out_time=None
        ).first()
        
        if not log:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'No active clock-in found'})
            }
        
        # Update clock out
        now = datetime.now()
        log.clock_out_time = now
        db.session.commit()
        
        # Calculate hours worked
        worked_hours = (now - log.clock_in_time).total_seconds() / 3600
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'message': 'Clocked out successfully',
                'time': now.isoformat(),
                'worked_hours': round(worked_hours, 2)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }

def handle_status(employee_id):
    """Get employee status"""
    try:
        today = date.today()
        log = AttendanceLog.query.filter_by(employee_id=employee_id, date_only=today).first()
        
        if not log:
            status = 'not_clocked_in'
            worked_hours = 0
            clock_in_time = None
        elif log.clock_out_time is None:
            status = 'clocked_in'
            worked_hours = (datetime.now() - log.clock_in_time).total_seconds() / 3600
            clock_in_time = log.clock_in_time.isoformat()
        else:
            status = 'clocked_out'
            worked_hours = (log.clock_out_time - log.clock_in_time).total_seconds() / 3600
            clock_in_time = log.clock_in_time.isoformat()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'employee_id': employee_id,
                'status': status,
                'worked_hours': round(worked_hours, 2),
                'clock_in_time': clock_in_time
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }

def handle_get_staff():
    """Get all staff"""
    try:
        employees = Employee.query.all()
        staff = [{
            'id': emp.id,
            'employee_id': emp.employee_id,
            'name': emp.name,
            'date_added': emp.date_added.isoformat()
        } for emp in employees]
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(staff)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }

def handle_add_staff(request):
    """Add new staff member"""
    try:
        data = get_json_body(request)
        employee_id = data.get('employee_id')
        name = data.get('name')
        
        if not employee_id or not name:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Employee ID and name required'})
            }
        
        # Check if exists
        existing = Employee.query.filter_by(employee_id=employee_id).first()
        if existing:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Employee already exists'})
            }
        
        # Create new employee
        employee = Employee(employee_id=employee_id, name=name)
        db.session.add(employee)
        db.session.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'message': 'Staff member added successfully'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }

def handle_dashboard_stats():
    """Get dashboard stats"""
    try:
        today = date.today()
        total_employees = Employee.query.count()
        
        # Count distinct employees present today
        present_today = db.session.query(AttendanceLog.employee_id).filter(
            AttendanceLog.date_only == today
        ).distinct().count()
        
        pending_leaves = LeaveRequest.query.filter_by(status='Pending').count()
        attendance_rate = (present_today / total_employees * 100) if total_employees > 0 else 0
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'total_employees': total_employees,
                'present_today': present_today,
                'attendance_rate': round(attendance_rate, 1),
                'pending_leaves': pending_leaves
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }

def handle_get_leave_requests():
    """Get leave requests"""
    try:
        requests = LeaveRequest.query.all()
        leave_requests = []
        for req in requests:
            employee = Employee.query.filter_by(employee_id=req.employee_id).first()
            leave_requests.append({
                'id': req.id,
                'employee_id': req.employee_id,
                'employee_name': employee.name if employee else 'Unknown',
                'start_date': req.start_date.isoformat(),
                'end_date': req.end_date.isoformat(),
                'status': req.status,
                'created_at': req.created_at.isoformat()
            })
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(leave_requests)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }

def handle_leave_request(request):
    """Handle leave request"""
    try:
        data = get_json_body(request)
        employee_id = data.get('employee_id')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if not all([employee_id, start_date, end_date]):
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Employee ID, start date, and end date required'})
            }
        
        # Check employee exists
        employee = Employee.query.filter_by(employee_id=employee_id).first()
        if not employee:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Employee not found'})
            }
        
        # Create request
        leave_req = LeaveRequest(
            employee_id=employee_id,
            start_date=datetime.strptime(start_date, '%Y-%m-%d').date(),
            end_date=datetime.strptime(end_date, '%Y-%m-%d').date()
        )
        db.session.add(leave_req)
        db.session.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'message': 'Leave request submitted successfully'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': f'Error: {str(e)}'})
        }
with app.app_context():
    db.create_all()

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
                "employee_id": emp.employee_id,
                "name": emp.name,
                "date_added": emp.date_added.strftime("%Y-%m-%d")
            } for emp in staff
        ]
        return jsonify(result), 200
    except Exception:
        return jsonify({"error": "An error occurred fetching staff data"}), 500

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

# This is the entry point for Vercel
if __name__ == "__main__":
    app.run(debug=True)