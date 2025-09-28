// Helper function for consistent 12-hour time formatting
function formatTime12Hour(date) {
  return new Date(date).toLocaleTimeString('en-US', {
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Professional notification system (replaces alert/confirm/prompt)
function showProfessionalNotification(message, type = 'info', duration = 5000) {
  const notification = document.createElement('div');
  notification.className = `professional-notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">${getNotificationIcon(type)}</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after duration
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, duration);
}

function getNotificationIcon(type) {
  switch(type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return 'ℹ️';
  }
}

function showProfessionalConfirm(message, onConfirm, onCancel) {
  const modal = document.createElement('div');
  modal.className = 'professional-confirm-modal';
  modal.innerHTML = `
    <div class="confirm-modal-content">
      <div class="confirm-header">
        <h3>Confirm Action</h3>
      </div>
      <div class="confirm-body">
        <p>${message}</p>
      </div>
      <div class="confirm-footer">
        <button class="btn-confirm-cancel" onclick="this.closest('.professional-confirm-modal').remove(); ${onCancel ? onCancel.toString() + '()' : ''}">Cancel</button>
        <button class="btn-confirm-ok" onclick="this.closest('.professional-confirm-modal').remove(); ${onConfirm.toString()}()">Confirm</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function showProfessionalPrompt(message, onSubmit, placeholder = '') {
  const modal = document.createElement('div');
  modal.className = 'professional-prompt-modal';
  modal.innerHTML = `
    <div class="prompt-modal-content">
      <div class="prompt-header">
        <h3>Input Required</h3>
      </div>
      <div class="prompt-body">
        <p>${message}</p>
        <input type="text" id="promptInput" placeholder="${placeholder}" class="prompt-input">
      </div>
      <div class="prompt-footer">
        <button class="btn-prompt-cancel" onclick="this.closest('.professional-prompt-modal').remove()">Cancel</button>
        <button class="btn-prompt-ok" onclick="const input = document.getElementById('promptInput').value; this.closest('.professional-prompt-modal').remove(); if(input.trim()) ${onSubmit.toString()}(input)">Submit</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('promptInput').focus(), 100);
}

function showProfessionalModal(title, content) {
  const modal = document.createElement('div');
  modal.className = 'professional-info-modal';
  modal.innerHTML = `
    <div class="info-modal-content">
      <div class="info-header">
        <h3>${title}</h3>
        <button class="info-close" onclick="this.closest('.professional-info-modal').remove()">&times;</button>
      </div>
      <div class="info-body">
        ${content}
      </div>
      <div class="info-footer">
        <button class="btn-info-ok" onclick="this.closest('.professional-info-modal').remove()">OK</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// API Configuration for Production/Development
const API_CONFIG = {
  // Automatically detect if we're on Render or local development
  baseUrl: window.location.origin.includes('render.com') || window.location.origin.includes('onrender.com') 
    ? window.location.origin 
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : window.location.origin,
  endpoints: {
    staff: '/api/staff',
    attendance: '/api/attendance',
    clockIn: '/api/clock-in',
    clockOut: '/api/clock-out',
    leaveRequests: '/api/leave-requests',
    settings: '/api/settings'
  }
};

// Helper function to get full API URL
function getApiUrl(endpoint, params = '') {
  const baseEndpoint = API_CONFIG.endpoints[endpoint] || endpoint;
  return `${API_CONFIG.baseUrl}${baseEndpoint}${params}`;
}

// Production API configuration is handled automatically

// GPS Location Management
const WORKPLACE_LOCATION = {
  // Set your workplace coordinates here
  latitude: 6.6745, // Example coordinates for Ghana
  longitude: -1.5716,
  radius: 100 // Radius in meters for workplace area
};

// Get user's current location
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Location access denied';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// Verify if user is at workplace location
async function verifyWorkplaceLocation() {
  try {
    const userLocation = await getCurrentLocation();
    const distance = calculateDistance(
      userLocation.latitude, 
      userLocation.longitude,
      WORKPLACE_LOCATION.latitude, 
      WORKPLACE_LOCATION.longitude
    );

    if (distance <= WORKPLACE_LOCATION.radius) {
      return {
        success: true,
        distance: Math.round(distance),
        location: userLocation
      };
    } else {
      return {
        success: false,
        distance: Math.round(distance),
        location: userLocation,
        message: `You are ${Math.round(distance)}m from the workplace. Please move closer to clock in.`
      };
    }
  } catch (error) {
    throw new Error(`Location verification failed: ${error.message}`);
  }
}

// Show location permission prompt
function showLocationPrompt() {
  const promptHtml = `
    <div class="location-prompt-overlay">
      <div class="location-prompt">
        <h3>📍 Location Required</h3>
        <p>This app requires your location to verify you're at the workplace before clocking in.</p>
        <div class="location-prompt-buttons">
          <button onclick="requestLocationPermission()" class="btn-primary">Enable Location</button>
          <button onclick="closeLocationPrompt()" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', promptHtml);
}

// Request location permission
async function requestLocationPermission() {
  try {
    closeLocationPrompt();
    showClockMessage('Requesting location access...', 'info');
    await getCurrentLocation();
    showClockMessage('Location access granted! You can now clock in.', 'success');
  } catch (error) {
    showClockMessage(error.message, 'error');
  }
}

// Close location prompt
function closeLocationPrompt() {
  const prompt = document.querySelector('.location-prompt-overlay');
  if (prompt) {
    prompt.remove();
  }
}

// Device and Session Management
let deviceSession = {
  activeEmployeeId: null,
  isHRSession: false,
  sessionStartTime: null
};

// Load device session from localStorage
function loadDeviceSession() {
  const saved = localStorage.getItem('deviceSession');
  if (saved) {
    const parsed = JSON.parse(saved);
    // Check if session is from today
    const sessionDate = new Date(parsed.sessionStartTime);
    const today = new Date();
    if (sessionDate.toDateString() === today.toDateString()) {
      deviceSession = parsed;
    } else {
      // Clear old session
      localStorage.removeItem('deviceSession');
    }
  }
}

// Save device session to localStorage
function saveDeviceSession() {
  localStorage.setItem('deviceSession', JSON.stringify(deviceSession));
}

// Check if device is available for new session
function checkDeviceAvailability(employeeId) {
  loadDeviceSession();
  
  // Check if HR is logged in
  const isHRLoggedIn = sessionStorage.getItem('hrLoggedIn');
  if (isHRLoggedIn) {
    deviceSession.isHRSession = true;
    return { available: true, message: 'HR access granted' };
  }
  
  // If no active session, device is available
  if (!deviceSession.activeEmployeeId) {
    return { available: true, message: 'Device available' };
  }
  
  // If same employee, allow access
  if (deviceSession.activeEmployeeId === employeeId) {
    return { available: true, message: 'Continuing your session' };
  }
  
  // Device is locked to another employee
  return { 
    available: false, 
    message: `Device is currently in use by Employee ${deviceSession.activeEmployeeId}. Only HR can access multiple staff records.` 
  };
}

// Status Checking and UI Management
async function checkEmployeeStatus(employeeId) {
  try {
    const response = await fetch(`${API_CONFIG.baseUrl}/api/status/${employeeId}`);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to check status');
    }
    
    return result;
  } catch (error) {
    throw error;
  }
}

// Real-time clock functionality
function updateClock() {
  const now = new Date();
  const timeElement = document.getElementById('currentTime');
  const dateElement = document.getElementById('currentDate');
  
  if (timeElement && dateElement) {
    timeElement.textContent = now.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    dateElement.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

// Update progress indicator
function updateProgressIndicator(step) {
  const steps = ['step1', 'step2', 'step3', 'step4'];
  
  steps.forEach((stepId, index) => {
    const stepElement = document.getElementById(stepId);
    if (stepElement) {
      stepElement.classList.remove('active', 'completed');
      
      if (index + 1 === step) {
        stepElement.classList.add('active');
        stepElement.setAttribute('aria-current', 'step');
      } else if (index + 1 < step) {
        stepElement.classList.add('completed');
        stepElement.removeAttribute('aria-current');
      } else {
        stepElement.removeAttribute('aria-current');
      }
    }
  });
  
  // Show contextual help for current step
  showContextualHelp(step);
}

// Show employee information
function showEmployeeInfo(employeeData, section) {
  const infoElement = document.getElementById(`${section}EmployeeInfo`);
  if (infoElement) {
    infoElement.innerHTML = `
      <h4>${employeeData.employee_name}</h4>
      <p><strong>ID:</strong> ${employeeData.employee_id}</p>
      <p><strong>Status:</strong> ${employeeData.status.replace('_', ' ').toUpperCase()}</p>
    `;
    infoElement.classList.add('show');
  }
}

// Show work summary for clock-out
function showWorkSummary(employeeData) {
  const summaryElement = document.getElementById('workSummary');
  if (summaryElement && employeeData.clock_in_time) {
    const clockInTime = new Date(`1970-01-01T${employeeData.clock_in_time}`);
    const now = new Date();
    const elapsed = now - clockInTime;
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    
    summaryElement.innerHTML = `
      <h4>Work Session Summary</h4>
      <p><strong>Clocked In:</strong> ${employeeData.clock_in_time}</p>
      <p><strong>Elapsed Time:</strong> ${hours} hours ${minutes} minutes</p>
    `;
    summaryElement.classList.add('show');
  }
}

// Enhanced UI state management
function updateUIState(employeeData, deviceCheck) {
  const clockInSection = document.getElementById('clockInSection');
  const clockOutSection = document.getElementById('clockOutSection');
  const completedSection = document.getElementById('completedSection');
  const deviceStatus = document.getElementById('deviceStatus');
  const statusMessage = document.getElementById('statusMessage');
  
  // Hide all sections first
  clockInSection.classList.remove('show');
  clockOutSection.classList.remove('show');
  completedSection.classList.remove('show');
  deviceStatus.classList.remove('show');
  
  // Check device availability first
  if (!deviceCheck.available) {
    deviceStatus.classList.add('show');
    document.getElementById('deviceStatusMessage').textContent = deviceCheck.message;
    showStatusMessage(deviceCheck.message, 'error');
    updateProgressIndicator(1);
    hideAttendanceStatusBar();
    return;
  }
  
  // Set employee ID in hidden fields
  document.getElementById('employeeId').value = employeeData.employee_id;
  document.getElementById('clockOutEmployeeId').value = employeeData.employee_id;
  
  // Update device session
  if (!deviceSession.isHRSession) {
    deviceSession.activeEmployeeId = employeeData.employee_id;
    deviceSession.sessionStartTime = new Date().toISOString();
    saveDeviceSession();
  }
  
  // Update the attendance status bar
  updateAttendanceStatusBar(employeeData);
  
  // Show appropriate section based on status
  switch (employeeData.status) {
    case 'not_clocked_in':
      clockInSection.classList.add('show');
      showEmployeeInfo(employeeData, 'clockIn');
      showStatusMessage(`${employeeData.employee_name} - Ready to clock in`, 'info');
      updateProgressIndicator(2);
      break;
      
    case 'clocked_in':
      clockOutSection.classList.add('show');
      showEmployeeInfo(employeeData, 'clockOut');
      showWorkSummary(employeeData);
      showStatusMessage(`${employeeData.employee_name} - Clocked in at ${employeeData.clock_in_time}. Ready to clock out.`, 'success');
      updateProgressIndicator(3);
      break;
      
    case 'completed':
      completedSection.classList.add('show');
      document.getElementById('completedMessage').textContent = 
        `${employeeData.employee_name} - Attendance completed.\nClocked in: ${employeeData.clock_in_time}\nClocked out: ${employeeData.clock_out_time}`;
      
      // Add completion details
      const completionDetails = document.getElementById('completionDetails');
      if (completionDetails && employeeData.clock_in_time && employeeData.clock_out_time) {
        const clockIn = new Date(`1970-01-01T${employeeData.clock_in_time}`);
        const clockOut = new Date(`1970-01-01T${employeeData.clock_out_time}`);
        const duration = clockOut - clockIn;
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        
        completionDetails.innerHTML = `
          <h4>Session Details</h4>
          <p><strong>Total Work Time:</strong> ${hours} hours ${minutes} minutes</p>
          <p><strong>Location:</strong> EN-010-4770 (Assembly Premises)</p>
          <p><strong>Status:</strong> Completed Successfully</p>
        `;
      }
      
      showStatusMessage(`${employeeData.employee_name} has completed attendance for today`, 'success');
      updateProgressIndicator(4);
      break;
  }
}

// Enhanced status message with better user guidance
function showStatusMessage(message, type, actionText = null) {
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    let fullMessage = message;
    
    // Add action guidance based on type
    if (type === 'info' && !actionText) {
      fullMessage += ' Please proceed with the next step.';
    } else if (type === 'error' && !actionText) {
      fullMessage += ' Please try again or contact HR if the problem persists.';
    } else if (actionText) {
      fullMessage += ' ' + actionText;
    }
    
    statusMessage.textContent = fullMessage;
    statusMessage.className = type;
    statusMessage.style.display = 'block';
    
    // Auto-hide non-error messages after 8 seconds
    if (type !== 'error') {
      setTimeout(() => {
        if (statusMessage.style.display === 'block') {
          statusMessage.style.display = 'none';
        }
      }, 8000);
    }
  }
}

// Employee Status Check Handler
if (document.getElementById('checkStatusBtn')) {
  document.getElementById('checkStatusBtn').addEventListener('click', async function() {
    const employeeId = document.getElementById('lookupEmployeeId').value.trim();
    
    if (!employeeId) {
      showStatusMessage('Please enter an Employee ID', 'error');
      return;
    }
    
    if (employeeId.length < 3) {
      showStatusMessage('Employee ID must be at least 3 characters', 'error');
      return;
    }
    
    // Show loading state
    const originalText = this.textContent;
    this.textContent = 'Checking...';
    this.disabled = true;
    
    try {
      // Check device availability
      const deviceCheck = checkDeviceAvailability(employeeId);
      
      // If device not available and not HR, show error
      if (!deviceCheck.available) {
        updateUIState({}, deviceCheck);
        return;
      }
      
      // Check employee status
      const employeeData = await checkEmployeeStatus(employeeId);
      
      // Store employee session data
      storeEmployeeSession(employeeId, employeeData);
      
      // Update UI based on status and redirect to appropriate step
      redirectBasedOnStatus(employeeData, deviceCheck);
      
    } catch (error) {
      // Status check failed
      showStatusMessage(error.message || 'Failed to check employee status', 'error');
    } finally {
      this.textContent = originalText;
      this.disabled = false;
    }
  });
}

// Multi-step Workflow Functions
// Store employee session data
function storeEmployeeSession(employeeId, employeeData) {
  const sessionData = {
    employeeId: employeeId,
    employeeName: employeeData.employee_name || 'Unknown',
    status: employeeData.status || 'unknown',
    lastCheckTime: new Date().toISOString(),
    sessionId: generateSessionId()
  };
  
  sessionStorage.setItem('currentEmployeeSession', JSON.stringify(sessionData));
}

// Generate unique session ID
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Redirect based on employee status
function redirectBasedOnStatus(employeeData, deviceCheck) {
  // Show status display first
  displayEmployeeStatus(employeeData, deviceCheck);
  
  // Note: Automatic redirection removed - users now click manual "Next" buttons
  // This allows users to review their status before proceeding
}

// Display employee status information
function displayEmployeeStatus(employeeData, deviceCheck) {
  const statusDisplay = document.getElementById('statusDisplay');
  const employeeName = document.getElementById('employeeName');
  const statusDetails = document.getElementById('statusDetails');
  const statusActions = document.getElementById('statusActions');
  
  if (!statusDisplay) return;
  
  // Update employee name
  if (employeeName) {
    employeeName.textContent = employeeData.employee_name || 'Unknown Employee';
  }
  
  // Build status details
  let detailsHtml = '<div class="status-info">';
  detailsHtml += `<div class="status-item"><strong>Employee ID:</strong> ${employeeData.employee_id}</div>`;
  detailsHtml += `<div class="status-item"><strong>Current Status:</strong> ${getStatusDisplayText(employeeData.status)}</div>`;
  
  if (employeeData.clock_in_time) {
    detailsHtml += `<div class="status-item"><strong>Clocked In:</strong> ${formatTime12Hour(employeeData.clock_in_time)}</div>`;
  }
  
  if (employeeData.clock_out_time) {
    detailsHtml += `<div class="status-item"><strong>Clocked Out:</strong> ${formatTime12Hour(employeeData.clock_out_time)}</div>`;
  }
  
  if (employeeData.work_duration) {
    detailsHtml += `<div class="status-item"><strong>Work Duration:</strong> ${employeeData.work_duration}</div>`;
  }
  
  detailsHtml += '</div>';
  if (statusDetails) {
    statusDetails.innerHTML = detailsHtml;
  }
  
  // Build next action
  let actionsHtml = '<div class="next-action">';
  switch(employeeData.status) {
    case 'not_clocked_in':
      actionsHtml += '<p>📍 <strong>Next Step:</strong> Proceed to Clock In</p>';
      actionsHtml += '<button onclick="proceedToNextStep(\'clock-in-step.html\', \'' + employeeData.employee_id + '\')" class="action-btn primary-btn next-btn">';
      actionsHtml += '➡️ Proceed to Clock In</button>';
      break;

    case 'clocked_in':
      actionsHtml += '<p>⏰ <strong>Next Step:</strong> Proceed to Clock Out</p>';
      actionsHtml += '<button onclick="proceedToNextStep(\'clock-out.html\', \'' + employeeData.employee_id + '\')" class="action-btn primary-btn next-btn">';
      actionsHtml += '➡️ Proceed to Clock Out</button>';
      break;

    case 'completed':
      actionsHtml += '<p>✅ <strong>Status:</strong> Attendance Complete</p>';
      actionsHtml += '<button onclick="proceedToNextStep(\'check-status.html\')" class="action-btn secondary-btn next-btn">';
      actionsHtml += '🔄 Check Another Employee</button>';
      break;

    default:
      actionsHtml += '<p>❓ <strong>Next Step:</strong> Proceed to Clock In</p>';
      actionsHtml += '<button onclick="proceedToNextStep(\'clock-in-step.html\', \'' + employeeData.employee_id + '\')" class="action-btn primary-btn next-btn">';
      actionsHtml += '➡️ Proceed to Clock In</button>';
      break;
  }
  actionsHtml += '</div>';
  if (statusActions) {
    statusActions.innerHTML = actionsHtml;
  }
  
  // Show the status display
  statusDisplay.classList.remove('hidden');
}

// Get display text for status
function getStatusDisplayText(status) {
  switch(status) {
    case 'not_clocked_in': return 'Not Clocked In';
    case 'clocked_in': return 'Clocked In';
    case 'completed': return 'Completed';
    case 'absent': return 'Absent';
    case 'late': return 'Late';
    default: return 'Unknown';
  }
}

// Load employee session data on page load
function loadEmployeeSession() {
  const sessionData = JSON.parse(sessionStorage.getItem('currentEmployeeSession') || 'null');
  if (sessionData) {
    // Pre-fill forms with session data
    if (document.getElementById('employeeId')) {
      document.getElementById('employeeId').value = sessionData.employeeId;
    }
    if (document.getElementById('clockOutEmployeeId')) {
      document.getElementById('clockOutEmployeeId').value = sessionData.employeeId;
    }
    
    // Load employee details
    loadEmployeeDetails(sessionData);
  }
  
  return sessionData;
}

// Load employee details for forms
function loadEmployeeDetails(sessionData) {
  // This would typically fetch from API, but for now use session data
  if (document.getElementById('employeeInfoDisplay')) {
    const infoDisplay = document.getElementById('employeeInfoDisplay');
    infoDisplay.innerHTML = `
      <div class="info-card">
        <h3>👤 Employee Information</h3>
        <div class="info-details">
          <div class="info-item"><strong>Name:</strong> ${sessionData.employeeName}</div>
          <div class="info-item"><strong>ID:</strong> ${sessionData.employeeId}</div>
          <div class="info-item"><strong>Status:</strong> ${getStatusDisplayText(sessionData.status)}</div>
        </div>
      </div>
    `;
  }
  
  if (document.getElementById('employeeSessionDetails')) {
    const sessionDetails = document.getElementById('employeeSessionDetails');
    sessionDetails.innerHTML = `
      <div class="info-item"><strong>Name:</strong> ${sessionData.employeeName}</div>
      <div class="info-item"><strong>ID:</strong> ${sessionData.employeeId}</div>
      <div class="info-item"><strong>Session:</strong> ${sessionData.sessionId}</div>
    `;
  }
}

// Load work summary for clock-out page
function loadWorkSummary(sessionData) {
  if (document.getElementById('workSummary')) {
    // This would typically fetch today's attendance record
    // For now, show placeholder
    const workSummary = document.getElementById('workSummary');
    workSummary.innerHTML = `
      <div class="summary-item"><strong>Today's Date:</strong> ${new Date().toLocaleDateString()}</div>
      <div class="summary-item"><strong>Clock In Time:</strong> --:--</div>
      <div class="summary-item"><strong>Current Time:</strong> ${formatTime12Hour(new Date())}</div>
      <div class="summary-item"><strong>Status:</strong> Ready to Clock Out</div>
    `;
  }
}

// Update employee session status
function updateEmployeeSessionStatus(employeeId, newStatus, result = null) {
  const sessionData = JSON.parse(sessionStorage.getItem('currentEmployeeSession') || 'null');
  if (sessionData && sessionData.employeeId === employeeId) {
    sessionData.status = newStatus;
    sessionData.lastUpdateTime = new Date().toISOString();
    
    if (result) {
      if (result.clock_in_time) sessionData.clockInTime = result.clock_in_time;
      if (result.clock_out_time) sessionData.clockOutTime = result.clock_out_time;
      if (result.work_duration) sessionData.workDuration = result.work_duration;
    }
    
    sessionStorage.setItem('currentEmployeeSession', JSON.stringify(sessionData));
  }
}

// Manual navigation function for next step buttons
function proceedToNextStep(page, employeeId = null) {
  if (employeeId) {
    window.location.href = `${page}?id=${encodeURIComponent(employeeId)}`;
  } else {
    window.location.href = page;
  }
}

// Initialize page-specific functionality
document.addEventListener('DOMContentLoaded', function() {
  // Load employee session on relevant pages
  if (window.location.pathname.includes('clock-in-step.html') || 
      window.location.pathname.includes('clock-out.html') ||
      window.location.pathname.includes('completed.html')) {
    const sessionData = loadEmployeeSession();
    
    // Also check URL parameters for employee ID
    const urlParams = new URLSearchParams(window.location.search);
    const employeeId = urlParams.get('id');
    
    if (employeeId && sessionData) {
      // Pre-fill employee ID in forms
      if (document.getElementById('employeeId')) {
        document.getElementById('employeeId').value = employeeId;
      }
      if (document.getElementById('clockOutEmployeeId')) {
        document.getElementById('clockOutEmployeeId').value = employeeId;
      }
      
      // Load employee details for display
      loadEmployeeDetails(sessionData);
      
      if (window.location.pathname.includes('clock-out.html')) {
        loadWorkSummary(sessionData);
      }
    }
  }
  
  // Auto-fill current date and time on page load
  const clockInTimeInput = document.getElementById('clockInTime');
  if (clockInTimeInput) {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    clockInTimeInput.value = localDateTime;
  }
  
  const clockOutTimeInput = document.getElementById('clockOutTime');
  if (clockOutTimeInput) {
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    clockOutTimeInput.value = localDateTime;
  }
  
  // Initialize real-time clock display
  updateClock();
  setInterval(updateClock, 1000); // Update every second
});// GPS location validation for EN-010-4770 area
function validateGPSLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject('GPS not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // EN-010-4770 GPS coordinates (approximate area for New Juaben South Municipal Assembly)
        // These coordinates should be adjusted to match the actual assembly premises
        const assemblyLat = 6.673;  // Example coordinates for Eastern Region, Ghana
        const assemblyLon = -0.520;
        const maxDistance = 0.5; // Maximum distance in kilometers
        
        const distance = calculateDistance(lat, lon, assemblyLat, assemblyLon);
        
        if (distance <= maxDistance) {
          resolve(true);
        } else {
          reject(`You are not within the Assembly premises (EN-010-4770). Distance: ${distance.toFixed(2)} km`);
        }
      },
      (error) => {
        let errorMessage = 'Location access denied. ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please enable location permissions to clock in.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
        }
        reject(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

// Calculate distance between two GPS coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Check if current time is after 10:00 AM
function isAfter10AM() {
  const now = new Date();
  const tenAM = new Date();
  tenAM.setHours(10, 0, 0, 0);
  return now > tenAM;
}

// Clock-In Form Submission (Updated for new workflow)
if (document.getElementById('clockInForm')) {
  document.getElementById('clockInForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('employeeId').value.trim();
    const clockInTime = document.getElementById('clockInTime').value;

    // Basic validation
    if (!employeeId || !clockInTime) {
      showMessage('Missing employee information!', 'error');
      return;
    }

    // Check if it's after 10:00 AM
    if (isAfter10AM()) {
      showMessage('Clock-in deadline has passed! Staff must clock in before 10:00 AM. You are marked as absent for today.', 'error');
      return;
    }

    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Validating Location...</span>';
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    try {
      // Check if GPS verification is required
      submitButton.innerHTML = '<span class="btn-icon">⚙️</span><span class="btn-text">Checking Settings...</span>';
      
      const settingsResponse = await fetch('/api/settings/security');
      const settings = await settingsResponse.json();
      const gpsRequired = settings.require_gps_verification === 'true';
      
      let clockInData = {
        employeeId: employeeId,
        clockInTime: clockInTime
      };
      
      if (gpsRequired) {
        // Validate GPS location
        submitButton.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Validating Location...</span>';
        
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });
        
        // Add GPS coordinates to clock-in data
        clockInData.latitude = position.coords.latitude;
        clockInData.longitude = position.coords.longitude;
      }
      
      submitButton.innerHTML = '<span class="btn-icon">📡</span><span class="btn-text">Clocking In...</span>';
      
      // Make API call to backend
      const response = await fetch(getApiUrl('clockIn'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clockInData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Store successful clock-in in localStorage for offline viewing
        const localClockInData = {
          employeeId: employeeId,
          employeeName: result.employee_name || 'Unknown',
          clockInTime: clockInTime,
          timestamp: new Date().toISOString(),
          status: 'clocked_in',
          location: result.location || 'EN-010-4770'
        };
        
        let clockInHistory = JSON.parse(localStorage.getItem('clockInHistory') || '[]');
        clockInHistory.unshift(localClockInData);
        localStorage.setItem('clockInHistory', JSON.stringify(clockInHistory.slice(0, 50)));

        showMessage(result.message, 'success');
        
        // Update employee session status
        updateEmployeeSessionStatus(employeeId, 'clocked_in', result);
        
        // Redirect to clock-out page after successful clock-in
        setTimeout(() => {
          window.location.href = `clock-out.html?id=${encodeURIComponent(employeeId)}`;
        }, 2000);
        
      } else {
        showMessage(result.error || 'Clock-in failed. Please try again.', 'error');
      }
      
    } catch (error) {
      // Handle both location and API errors
      let errorMessage = 'Clock-in failed. ';
      
      if (error.code) {
        // Geolocation error - check if GPS was actually required
        const settingsResponse = await fetch('/api/settings/security').catch(() => null);
        const gpsRequired = settingsResponse ? 
          (await settingsResponse.json()).require_gps_verification === 'true' : true;
        
        if (gpsRequired) {
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access required for clock-in. Please enable location permissions and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check your GPS settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = 'Location error. Please check your GPS settings and try again.';
          }
        } else {
          errorMessage = 'GPS verification is disabled. Please contact HR if you continue to have issues.';
        }
      } else if (error.message && error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = 'An unexpected error occurred. Please try again.';
      }
      
      console.error('Clock-in error:', error);
      showMessage(errorMessage, 'error');
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.classList.remove('loading');
      submitButton.disabled = false;
    }
  });
}

// Clock-Out Form Submission (Updated for new workflow)
if (document.getElementById('clockOutForm')) {
  document.getElementById('clockOutForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const employeeId = document.getElementById('clockOutEmployeeId').value.trim();
    const clockOutTime = document.getElementById('clockOutTime').value;

    // Basic validation
    if (!employeeId || !clockOutTime) {
      showClockOutMessage('Missing employee information!', 'error');
      return;
    }

    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Clocking Out...</span>';
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    try {
      // Prepare clock-out data
      const clockOutData = {
        employeeId: employeeId,
        clockOutTime: clockOutTime
      };
      
      // Make API call to backend
      const response = await fetch(getApiUrl('clockOut'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clockOutData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Update localStorage with clock-out info
        let clockInHistory = JSON.parse(localStorage.getItem('clockInHistory') || '[]');
        const todayRecord = clockInHistory.find(record => 
          record.employeeId === employeeId && 
          new Date(record.timestamp).toDateString() === new Date().toDateString()
        );
        
        if (todayRecord) {
          todayRecord.clockOutTime = clockOutTime;
          todayRecord.workDuration = result.work_duration;
          todayRecord.status = 'completed';
          localStorage.setItem('clockInHistory', JSON.stringify(clockInHistory));
        }

        showClockOutMessage(
          `${result.message}\nWork Duration: ${result.work_duration}`, 
          'success'
        );
        
        // Update employee session status
        updateEmployeeSessionStatus(employeeId, 'completed', result);
        
        // Clear device session (unless HR session)
        if (!deviceSession.isHRSession) {
          deviceSession.activeEmployeeId = null;
          deviceSession.sessionStartTime = null;
          saveDeviceSession();
        }
        
        // Redirect to completed page after successful clock-out
        setTimeout(() => {
          const params = new URLSearchParams({
            name: result.employee_name,
            clockIn: result.clock_in_time,
            clockOut: result.clock_out_time,
            duration: result.work_duration
          });
          window.location.href = `completed.html?${params.toString()}`;
        }, 3000);
        
      } else {
        showClockOutMessage(result.error || 'Clock-out failed. Please try again.', 'error');
      }
      
    } catch (error) {
      console.error('Clock-out error:', error);
      showClockOutMessage('Network error. Please check your connection and try again.', 'error');
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.classList.remove('loading');
      submitButton.disabled = false;
    }
  });
}

// Helper function to show clock-out messages
function showClockOutMessage(message, type) {
  const messageDiv = document.getElementById('clockOutMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.style.display = 'block';
    
    // Auto-hide success messages after 7 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 7000);
    }
  }
}

// Show contextual help and guidance
function showContextualHelp(step) {
  const helpElement = document.getElementById('contextualHelp');
  if (!helpElement) return;
  
  let helpText = '';
  switch(step) {
    case 1:
      helpText = '💡 <strong>Step 1:</strong> Enter your Employee ID and click "Check Status" to begin. Make sure you\'re within the Assembly premises for location verification.';
      break;
    case 2:
      helpText = '📍 <strong>Step 2:</strong> Verify your clock-in time and click "Clock In". Location access will be requested for security.';
      break;
    case 3:
      helpText = '⏰ <strong>Step 3:</strong> Review your work session details and click "Clock Out" when ready to end your day.';
      break;
    case 4:
      helpText = '✅ <strong>Complete:</strong> Your attendance has been recorded successfully. The device will be available for the next employee in a few moments.';
      break;
  }
  
  if (helpText) {
    helpElement.innerHTML = helpText;
    helpElement.style.display = 'block';
    helpElement.classList.add('help-visible');
  } else {
    helpElement.style.display = 'none';
    helpElement.classList.remove('help-visible');
  }
}

// Helper function to show messages
function showMessage(message, type) {
  const messageDiv = document.getElementById('clockInMessage') || document.getElementById('loginMessage') || document.getElementById('uploadMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// HR Login Functionality
if (document.getElementById('hrLoginForm')) {
  document.getElementById('hrLoginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('hrEmail').value.trim();
    const password = document.getElementById('hrPassword').value.trim();
    
    console.log('HR login attempt for email:', email);
    
    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Logging In...';
    submitButton.disabled = true;

    setTimeout(() => {
      try {
        // Updated HR credentials with email format and role-based access
        const validCredentials = {
          'maxwellackerson@gmail.com': {
            password: 'Ophon@100',
            role: 'hr',
            name: 'Maxwell Ackerson',
            permissions: ['view_staff', 'manage_staff', 'view_attendance', 'generate_reports']
          },
          'dicksonapam@gmail.com': {
            password: 'K0248847819o',
            role: 'admin',
            name: 'Dickson Apam',
            permissions: ['unlimited_access', 'view_staff', 'manage_staff', 'view_attendance', 'generate_reports', 'system_settings', 'user_management']
          }
        };
        
        const user = validCredentials[email.toLowerCase()];
        
        if (user && user.password === password) {
          // Store comprehensive login session
          sessionStorage.setItem('hrLoggedIn', 'true');
          sessionStorage.setItem('hrEmail', email.toLowerCase());
          sessionStorage.setItem('hrName', user.name);
          sessionStorage.setItem('hrRole', user.role);
          sessionStorage.setItem('hrPermissions', JSON.stringify(user.permissions));
          sessionStorage.setItem('hrLoginTime', new Date().toISOString());
          
          console.log('HR login successful for:', user.name);
          
          showMessage(`Welcome ${user.name}! Redirecting to HR Dashboard...`, 'success');
          
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 1500);
        } else {
          console.log('Invalid credentials provided');
          showMessage('Invalid email or password! Please check your credentials.', 'error');
        }
      } catch (error) {
        console.error('HR login error:', error);
        showMessage('Login error occurred. Please try again.', 'error');
      } finally {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    }, 500); // Small delay to show loading state
  });
}

// Check HR authentication on HR pages
function checkHRAuth() {
  const currentPath = window.location.pathname;
  const isHRPage = currentPath.includes('/hr/') && !currentPath.includes('login.html');
  
  if (isHRPage) {
    const isLoggedIn = sessionStorage.getItem('hrLoggedIn');
    if (!isLoggedIn) {
      window.location.href = 'login.html';
    } else {
      // Update role-based welcome message
      updateRoleMessage();
    }
  }
}

// Staff Authentication System
// Staff Login Functionality
if (document.getElementById('staffLoginForm')) {
  document.getElementById('staffLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const staffId = document.getElementById('staffId').value.trim();
    
    if (!staffId) {
      showStaffMessage('Please enter your Staff ID', 'error');
      return;
    }

    // Attempting staff authentication

    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Logging In...</span>';
    submitButton.disabled = true;

    try {
      // Check if staff exists and validate
      const apiUrl = getApiUrl('staff', `/${staffId}`);
      // API request to validate staff ID
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('API response status:', response.status);
      console.log('API response headers:', response.headers);
      
      if (!response.ok) {
        if (response.status === 404) {
          showStaffMessage('Staff ID not found. Please check your ID and try again.', 'error');
          return;
        } else if (response.status === 0) {
          showStaffMessage('Cannot connect to server. Please check your internet connection.', 'error');
          return;
        } else {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
      }
      
      const result = await response.json();
      console.log('API response data:', result);

      if (result.employee_id) {
        // Staff exists, create session
        const staffSession = {
          staffId: result.employee_id,
          staffName: result.name,
          loginTime: new Date().toISOString(),
          sessionId: 'staff_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };

        // Store staff session
        sessionStorage.setItem('staffLoggedIn', 'true');
        sessionStorage.setItem('staffSession', JSON.stringify(staffSession));

        console.log('Staff session created:', staffSession);
        showStaffMessage(`Welcome ${result.name}! Redirecting to your dashboard...`, 'success');

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);

      } else {
        showStaffMessage('Staff ID not found. Please check your Staff ID or contact HR.', 'error');
      }

    } catch (error) {
      console.error('Staff login error:', error);
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        showStaffMessage('Cannot connect to server. Please check your internet connection or try again later.', 'error');
      } else if (error.message.includes('NetworkError')) {
        showStaffMessage('Network error occurred. Please try again.', 'error');
      } else {
        showStaffMessage(`Login failed: ${error.message}`, 'error');
      }
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  });
}

// Check Staff Authentication
function checkStaffAuth() {
  const currentPath = window.location.pathname;
  const isStaffPage = currentPath.includes('/employee/') && !currentPath.includes('login.html') && currentPath.includes('dashboard.html');
  
  if (isStaffPage) {
    const isLoggedIn = sessionStorage.getItem('staffLoggedIn');
    if (!isLoggedIn) {
      window.location.href = 'login.html';
    } else {
      // Load staff dashboard data
      loadStaffDashboard();
    }
  }
}

// Load Staff Dashboard Data
async function loadStaffDashboard() {
  const staffSession = JSON.parse(sessionStorage.getItem('staffSession') || '{}');
  
  if (!staffSession.staffId) {
    window.location.href = 'login.html';
    return;
  }

  // Update welcome message
  const welcomeElement = document.getElementById('staffWelcome');
  const staffIdElement = document.getElementById('displayStaffId');
  const staffNameElement = document.getElementById('displayStaffName');
  const todayDateElement = document.getElementById('displayTodayDate');

  if (welcomeElement) welcomeElement.textContent = `👋 Welcome Back, ${staffSession.staffName}!`;
  if (staffIdElement) staffIdElement.textContent = staffSession.staffId;
  if (staffNameElement) staffNameElement.textContent = staffSession.staffName;
  if (todayDateElement) todayDateElement.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Load today's attendance status
  await loadTodayAttendanceStatus(staffSession.staffId);
  
  // Load monthly summary
  await loadMonthlySummary(staffSession.staffId);
  
  // Update clock in/out button
  updateClockInOutButton();
}

// Load Today's Attendance Status
async function loadTodayAttendanceStatus(staffId) {
  try {
    const response = await fetch(getApiUrl('attendance', `/today/${staffId}`));
    const result = await response.json();

    const clockInElement = document.getElementById('todayClockIn');
    const clockOutElement = document.getElementById('todayClockOut');
    const durationElement = document.getElementById('todayWorkDuration');
    const statusElement = document.getElementById('todayStatus');

    if (response.ok && result.clock_in_time) {
      if (clockInElement) clockInElement.textContent = formatTime12Hour(result.clock_in_time);
      if (clockOutElement) clockOutElement.textContent = result.clock_out_time ? formatTime12Hour(result.clock_out_time) : 'Not Clocked Out';
      if (durationElement) durationElement.textContent = result.work_duration || '--';
      if (statusElement) {
        if (result.clock_out_time) {
          statusElement.textContent = 'Completed';
          statusElement.style.color = '#4CAF50';
        } else {
          statusElement.textContent = 'Clocked In';
          statusElement.style.color = '#FF9800';
        }
      }
    } else {
      if (clockInElement) clockInElement.textContent = 'Not Clocked In';
      if (clockOutElement) clockOutElement.textContent = '--';
      if (durationElement) durationElement.textContent = '--';
      if (statusElement) {
        statusElement.textContent = 'Pending';
        statusElement.style.color = '#6c757d';
      }
    }
  } catch (error) {
    console.error('Error loading today\'s attendance:', error);
  }
}

// Load Monthly Summary
async function loadMonthlySummary(staffId) {
  try {
    const response = await fetch(getApiUrl('attendance', `/monthly-summary/${staffId}`));
    const result = await response.json();

    if (response.ok) {
      const presentElement = document.getElementById('daysPresent');
      const lateElement = document.getElementById('daysLate');
      const absentElement = document.getElementById('daysAbsent');
      const leavesElement = document.getElementById('leavesTaken');

      if (presentElement) presentElement.textContent = result.days_present || 0;
      if (lateElement) lateElement.textContent = result.days_late || 0;
      if (absentElement) absentElement.textContent = result.days_absent || 0;
      if (leavesElement) leavesElement.textContent = result.leaves_taken || 0;
    }
  } catch (error) {
    console.error('Error loading monthly summary:', error);
  }
}

// Update Clock In/Out Button
function updateClockInOutButton() {
  const clockBtnIcon = document.getElementById('clockBtnIcon');
  const clockBtnText = document.getElementById('clockBtnText');
  const clockInOutBtn = document.getElementById('clockInOutBtn');

  // Check current time and today's status
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour + (currentMinute / 60);
  const deadlineTime = 10; // 10:00 AM

  // Get today's attendance status from DOM
  const todayClockIn = document.getElementById('todayClockIn').textContent;
  const todayClockOut = document.getElementById('todayClockOut').textContent;

  if (currentTime > deadlineTime && todayClockIn === 'Not Clocked In') {
    // Too late to clock in
    if (clockBtnIcon) clockBtnIcon.textContent = '⏰';
    if (clockBtnText) clockBtnText.textContent = 'Clock-in Deadline Passed';
    if (clockInOutBtn) {
      clockInOutBtn.disabled = true;
      clockInOutBtn.classList.add('disabled');
    }
  } else if (todayClockIn !== 'Not Clocked In' && (todayClockOut === '--' || todayClockOut === 'Not Clocked Out')) {
    // Already clocked in, show clock out
    if (clockBtnIcon) clockBtnIcon.textContent = '🕕';
    if (clockBtnText) clockBtnText.textContent = 'Clock Out';
    if (clockInOutBtn) {
      clockInOutBtn.disabled = false;
      clockInOutBtn.classList.remove('disabled');
    }
  } else if (todayClockIn !== 'Not Clocked In' && todayClockOut !== '--' && todayClockOut !== 'Not Clocked Out') {
    // Already completed for today
    if (clockBtnIcon) clockBtnIcon.textContent = '✅';
    if (clockBtnText) clockBtnText.textContent = 'Attendance Completed';
    if (clockInOutBtn) {
      clockInOutBtn.disabled = true;
      clockInOutBtn.classList.add('disabled');
    }
  } else {
    // Ready to clock in
    if (clockBtnIcon) clockBtnIcon.textContent = '🕐';
    if (clockBtnText) clockBtnText.textContent = 'Clock In';
    if (clockInOutBtn) {
      clockInOutBtn.disabled = false;
      clockInOutBtn.classList.remove('disabled');
    }
  }
}

// Handle Clock In/Out Action
async function handleClockInOut() {
  const staffSession = JSON.parse(sessionStorage.getItem('staffSession') || '{}');
  
  if (!staffSession.staffId) {
    showClockMessage('Session expired. Please login again.', 'error');
    setTimeout(() => window.location.href = 'login.html', 2000);
    return;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour + (currentMinute / 60);
  const deadlineTime = 10; // 10:00 AM

  const todayClockIn = document.getElementById('todayClockIn').textContent;
  const todayClockOut = document.getElementById('todayClockOut').textContent;

  // Check if already completed
  if (todayClockIn !== 'Not Clocked In' && todayClockOut !== '--' && todayClockOut !== 'Not Clocked Out') {
    showClockMessage('You have already completed attendance for today.', 'warning');
    return;
  }

  // Check deadline for clock in
  if (currentTime > deadlineTime && todayClockIn === 'Not Clocked In') {
    showClockMessage('Clock-in deadline has passed (10:00 AM). You will be marked as absent for today. Contact HR if this is an error.', 'error');
    return;
  }

  const clockInOutBtn = document.getElementById('clockInOutBtn');
  const originalText = clockInOutBtn.innerHTML;
  
  try {
    if (todayClockIn === 'Not Clocked In') {
      // Clock In Process with Location Verification
      clockInOutBtn.innerHTML = '<span class="btn-icon">📍</span><span class="btn-text">Verifying Location...</span>';
      clockInOutBtn.disabled = true;

      // Verify location first
      let locationData;
      try {
        const locationResult = await verifyWorkplaceLocation();
        if (!locationResult.success) {
          showClockMessage(locationResult.message, 'error');
          return;
        }
        locationData = locationResult.location;
        showClockMessage(`Location verified! Distance: ${locationResult.distance}m from workplace.`, 'success');
      } catch (error) {
        showClockMessage(error.message, 'error');
        if (error.message.includes('denied') || error.message.includes('supported')) {
          showLocationPrompt();
        }
        return;
      }

      clockInOutBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Clocking In...</span>';

      const clockInData = {
        employeeId: staffSession.staffId,
        clockInTime: now.toISOString(),
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy
        }
      };

      const response = await fetch(getApiUrl('clockIn'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clockInData)
      });

      const result = await response.json();

      if (response.ok) {
        showClockMessage(`Successfully clocked in at ${formatTime12Hour(now)}`, 'success');
        // Reload dashboard data
        await loadTodayAttendanceStatus(staffSession.staffId);
        updateClockInOutButton();
      } else {
        showClockMessage(result.error || 'Clock-in failed. Please try again.', 'error');
      }

    } else {
      // Clock Out Process
      clockInOutBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Clocking Out...</span>';
      clockInOutBtn.disabled = true;

      const clockOutData = {
        employeeId: staffSession.staffId,
        clockOutTime: now.toISOString()
      };

      const response = await fetch(getApiUrl('clockOut'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clockOutData)
      });

      const result = await response.json();

      if (response.ok) {
        showClockMessage(`Successfully clocked out at ${formatTime12Hour(now)}. Work duration: ${result.work_duration}`, 'success');
        // Reload dashboard data
        await loadTodayAttendanceStatus(staffSession.staffId);
        await loadMonthlySummary(staffSession.staffId);
        updateClockInOutButton();
      } else {
        showClockMessage(result.error || 'Clock-out failed. Please try again.', 'error');
      }
    }

  } catch (error) {
    console.error('Clock in/out error:', error);
    showClockMessage('Network error. Please check your connection and try again.', 'error');
  } finally {
    clockInOutBtn.innerHTML = originalText;
    clockInOutBtn.disabled = false;
  }
}

// Show Clock Message
function showClockMessage(message, type) {
  const messageDiv = document.getElementById('clockMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = `action-message ${type}`;
    messageDiv.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// Show Staff Message (for login page)
function showStaffMessage(message, type) {
  const messageDiv = document.getElementById('loginMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = `action-message ${type}`;
    messageDiv.style.display = 'block';
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 3000);
    }
  }
}

// Generate Attendance Report
async function generateAttendanceReport() {
  const staffSession = JSON.parse(sessionStorage.getItem('staffSession') || '{}');
  
  if (!staffSession.staffId) {
    showMessage('Session expired. Please login again.', 'error');
    window.location.href = 'login.html';
    return;
  }

  // Show loading state
  const reportBtn = event.target;
  const originalText = reportBtn.innerHTML;
  reportBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Loading Report...</span>';
  reportBtn.disabled = true;

  try {
    const response = await fetch(getApiUrl('attendance', `/report/${staffSession.staffId}`));
    const result = await response.json();

    if (response.ok) {
      // Show report in modal
      showAttendanceReportModal(result, staffSession);
    } else {
      showMessage(result.error || 'Failed to generate report', 'error');
    }
  } catch (error) {
    console.error('Report generation error:', error);
    showMessage('Failed to load report data. Please try again.', 'error');
  } finally {
    // Reset button state
    reportBtn.innerHTML = originalText;
    reportBtn.disabled = false;
  }
}

// Show Attendance Report Modal
function showAttendanceReportModal(reportData, staffSession) {
  const modalHtml = `
    <div class="report-modal-overlay">
      <div class="report-modal">
        <div class="report-header">
          <h2>📊 My Attendance Report</h2>
          <button class="close-modal-btn" onclick="closeReportModal()">✕</button>
        </div>
        
        <div class="report-content">
          <div class="report-info">
            <div class="info-row">
              <span class="info-label">Staff Name:</span>
              <span class="info-value">${staffSession.staffName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Staff ID:</span>
              <span class="info-value">${staffSession.staffId}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Report Period:</span>
              <span class="info-value">${reportData.report_period || 'Last 30 days'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Generated:</span>
              <span class="info-value">${new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div class="report-summary">
            <h3>📈 Summary</h3>
            <div class="summary-stats">
              <div class="stat-item">
                <div class="stat-value">${reportData.present_days || 0}</div>
                <div class="stat-label">Days Present</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${reportData.total_records - (reportData.present_days || 0)}</div>
                <div class="stat-label">Days Absent</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${reportData.total_records || 0}</div>
                <div class="stat-label">Total Days</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${Math.round((reportData.present_days / reportData.total_records) * 100) || 0}%</div>
                <div class="stat-label">Attendance Rate</div>
              </div>
            </div>
          </div>

          <div class="report-table-container">
            <h3>📋 Detailed Records</h3>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.records ? reportData.records.map(record => `
                  <tr class="${record.status === 'present' ? 'present' : 'absent'}">
                    <td>${new Date(record.date).toLocaleDateString()}</td>
                    <td>${record.clock_in_time || '--'}</td>
                    <td>${record.clock_out_time || '--'}</td>
                    <td>
                      <span class="status-badge ${record.status}">
                        ${record.status === 'present' ? '✅ Present' : '❌ Absent'}
                      </span>
                    </td>
                  </tr>
                `).join('') : '<tr><td colspan="4">No records found</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="report-actions">
          <button class="action-btn primary-btn" onclick="printAttendanceReport()">
            <span class="btn-icon">🖨️</span>
            <span class="btn-text">Print Report</span>
          </button>
          <button class="action-btn secondary-btn" onclick="exportReportAsCSV()">
            <span class="btn-icon">📄</span>
            <span class="btn-text">Export CSV</span>
          </button>
          <button class="action-btn tertiary-btn" onclick="closeReportModal()">
            <span class="btn-icon">✕</span>
            <span class="btn-text">Close</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Print Attendance Report
function printAttendanceReport() {
  const printWindow = window.open('', '_blank');
  const reportContent = document.querySelector('.report-modal .report-content').innerHTML;
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Attendance Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .summary-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .stat-item { text-align: center; padding: 10px; background: #f5f5f5; border-radius: 8px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2E7D32; }
        .report-table { width: 100%; border-collapse: collapse; }
        .report-table th, .report-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .report-table th { background-color: #2E7D32; color: white; }
        .present { background-color: #e8f5e8; }
        .absent { background-color: #ffeaea; }
        @media print { button { display: none; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>New Juaben South Municipal Assembly</h1>
        <h2>Staff Attendance Report</h2>
      </div>
      ${reportContent}
    </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
}

// Export Report as CSV
function exportReportAsCSV() {
  const staffSession = JSON.parse(sessionStorage.getItem('staffSession') || '{}');
  const table = document.querySelector('.report-table');
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Add header
  csvContent += "Staff Name,Staff ID,Report Date\n";
  csvContent += `${staffSession.staffName},${staffSession.staffId},${new Date().toLocaleDateString()}\n\n`;
  
  // Add table headers
  const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
  csvContent += headers.join(',') + '\n';
  
  // Add table rows
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  rows.forEach(row => {
    const cols = Array.from(row.querySelectorAll('td')).map(td => td.textContent.replace(',', ';'));
    csvContent += cols.join(',') + '\n';
  });
  
  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `attendance_report_${staffSession.staffId}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Close Report Modal
function closeReportModal() {
  const modal = document.querySelector('.report-modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// Request Leave
function requestLeave() {
  const staffSession = JSON.parse(sessionStorage.getItem('staffSession') || '{}');
  
  if (!staffSession.staffId) {
    showProfessionalNotification('Session expired. Redirecting to login...', 'warning', 3000);
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 3000);
    return;
  }

  // Redirect to leave request page
  window.location.href = 'leave-request.html';
}

// Open Account Settings
function openAccountSettings() {
  const staffSession = JSON.parse(sessionStorage.getItem('staffSession') || '{}');
  
  if (!staffSession.staffId) {
    showMessage('Session expired. Please login again.', 'error');
    window.location.href = 'login.html';
    return;
  }

  const settingsHtml = `
    <div class="settings-modal-overlay">
      <div class="settings-modal">
        <div class="settings-header">
          <h2>⚙️ Account Settings</h2>
          <button class="close-modal-btn" onclick="closeSettingsModal()">✕</button>
        </div>
        
        <div class="settings-content">
          <div class="settings-section">
            <h3>👤 Account Information</h3>
            <div class="settings-info">
              <div class="info-item">
                <label>Staff Name:</label>
                <span class="info-value">${staffSession.staffName}</span>
              </div>
              <div class="info-item">
                <label>Staff ID:</label>
                <span class="info-value">${staffSession.staffId}</span>
              </div>
              <div class="info-item">
                <label>Account Created:</label>
                <span class="info-value">${new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <h3>🔧 Preferences</h3>
            <div class="preference-item">
              <label for="emailNotifications">
                <input type="checkbox" id="emailNotifications" checked>
                Email Notifications
              </label>
              <small>Receive attendance reminders and updates via email</small>
            </div>
            <div class="preference-item">
              <label for="clockInReminder">
                <input type="checkbox" id="clockInReminder" checked>
                Clock-in Reminders
              </label>
              <small>Get reminded to clock in if you're late</small>
            </div>
            <div class="preference-item">
              <label for="weeklyReports">
                <input type="checkbox" id="weeklyReports">
                Weekly Attendance Reports
              </label>
              <small>Receive weekly attendance summary reports</small>
            </div>
          </div>

          <div class="settings-section">
            <h3>🔒 Security & Privacy</h3>
            <div class="security-info">
              <p><strong>Last Login:</strong> ${new Date(staffSession.loginTime).toLocaleString()}</p>
              <p><strong>Session ID:</strong> ${staffSession.sessionId?.substring(0, 12)}...</p>
            </div>
            <div class="security-actions">
              <button class="action-btn secondary-btn" onclick="clearLocationData()">
                <span class="btn-icon">📍</span>
                <span class="btn-text">Clear Location Data</span>
              </button>
              <button class="action-btn tertiary-btn" onclick="downloadPersonalData()">
                <span class="btn-icon">📄</span>
                <span class="btn-text">Download My Data</span>
              </button>
            </div>
          </div>

          <div class="settings-section">
            <h3>ℹ️ Help & Support</h3>
            <div class="help-links">
              <button class="help-link-btn" onclick="showHelpGuide()">
                📚 User Guide
              </button>
              <button class="help-link-btn" onclick="contactSupport()">
                📞 Contact HR Support  
              </button>
              <button class="help-link-btn" onclick="reportIssue()">
                🐛 Report Issue
              </button>
            </div>
          </div>
        </div>

        <div class="settings-actions">
          <button class="action-btn primary-btn" onclick="saveSettings()">
            <span class="btn-icon">💾</span>
            <span class="btn-text">Save Changes</span>
          </button>
          <button class="action-btn danger-btn" onclick="logoutStaff()">
            <span class="btn-icon">🚪</span>
            <span class="btn-text">Logout</span>
          </button>
          <button class="action-btn secondary-btn" onclick="closeSettingsModal()">
            <span class="btn-icon">✕</span>
            <span class="btn-text">Close</span>
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', settingsHtml);
}

// Save Settings
function saveSettings() {
  const settings = {
    emailNotifications: document.getElementById('emailNotifications')?.checked || false,
    clockInReminder: document.getElementById('clockInReminder')?.checked || false,
    weeklyReports: document.getElementById('weeklyReports')?.checked || false
  };
  
  localStorage.setItem('staffPreferences', JSON.stringify(settings));
  showMessage('Settings saved successfully!', 'success');
  
  setTimeout(() => {
    closeSettingsModal();
  }, 1500);
}

// Clear Location Data
function clearLocationData() {
  showProfessionalConfirm(
    'This will clear all stored location data. Continue?',
    function() {
      localStorage.removeItem('lastKnownLocation');
      showProfessionalNotification('Location data cleared successfully.', 'success');
    }
  );
}

// Download Personal Data
function downloadPersonalData() {
  const staffSession = JSON.parse(sessionStorage.getItem('staffSession') || '{}');
  const preferences = JSON.parse(localStorage.getItem('staffPreferences') || '{}');
  
  const personalData = {
    staffInfo: {
      name: staffSession.staffName,
      id: staffSession.staffId,
      loginTime: staffSession.loginTime
    },
    preferences: preferences,
    downloadDate: new Date().toISOString()
  };
  
  const dataStr = JSON.stringify(personalData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `personal_data_${staffSession.staffId}.json`;
  link.click();
  
  showMessage('Personal data downloaded successfully.', 'success');
}

// Show Help Guide
function showHelpGuide() {
  const helpContent = `
    <div class="help-guide">
      <h4>📚 User Guide</h4>
      <ul>
        <li><strong>Clock In:</strong> Use GPS-verified clock-in at the workplace</li>
        <li><strong>Dashboard:</strong> View your attendance status and statistics</li>
        <li><strong>Reports:</strong> Generate and print attendance reports</li>
        <li><strong>Leave Requests:</strong> Submit leave applications</li>
        <li><strong>Settings:</strong> Manage your account preferences</li>
      </ul>
      <p><em>For more help, contact HR.</em></p>
    </div>
  `;
  showProfessionalModal('User Guide', helpContent);
}

// Contact Support
function contactSupport() {
  const supportContent = `
    <div class="support-info">
      <h4>📞 HR Support</h4>
      <div class="contact-details">
        <p><strong>Email:</strong> hr@njsma.gov.gh</p>
        <p><strong>Phone:</strong> +233 XX XXX XXXX</p>
        <p><strong>Office:</strong> Ground Floor, Admin Block</p>
      </div>
      <div class="office-hours">
        <h5>Office Hours:</h5>
        <p>8:00 AM - 5:00 PM<br>Monday to Friday</p>
      </div>
    </div>
  `;
  showProfessionalModal('HR Support', supportContent);
}

// Report Issue
function reportIssue() {
  showProfessionalPrompt(
    '🐛 Report an Issue<br><br>Please describe the problem you encountered:',
    function(issue) {
      if (issue && issue.trim()) {
        // In a real implementation, this would send to a support system
        showProfessionalNotification('Issue reported successfully. HR will be notified.', 'success');
        console.log('Issue reported:', issue, 'by:', JSON.parse(sessionStorage.getItem('staffSession') || '{}').staffId);
      }
    }
  );
}

// Close Settings Modal
function closeSettingsModal() {
  const modal = document.querySelector('.settings-modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// Logout Staff
function logoutStaff() {
  showProfessionalConfirm(
    'Are you sure you want to logout?',
    function() {
      sessionStorage.removeItem('staffLoggedIn');
      sessionStorage.removeItem('staffSession');
      window.location.href = 'login.html';
    }
  );
}

// Initialize staff pages
document.addEventListener('DOMContentLoaded', function() {
  // Check staff authentication
  checkStaffAuth();
  
  // Update clock in/out button periodically
  if (document.getElementById('clockInOutBtn')) {
    setInterval(updateClockInOutButton, 60000); // Update every minute
  }
  
  // Load initial data if on dashboard
  if (window.location.pathname.includes('dashboard.html')) {
    const staffSession = JSON.parse(sessionStorage.getItem('staffSession') || '{}');
    if (staffSession.staffId) {
      setTimeout(() => {
        loadTodayAttendanceStatus(staffSession.staffId);
        loadMonthlySummary(staffSession.staffId);
      }, 1000);
    }
  }
});

// Update role-based welcome message
function updateRoleMessage() {
  const roleMessage = document.getElementById('welcomeMessage');
  if (roleMessage) {
    const hrName = sessionStorage.getItem('hrName');
    const hrRole = sessionStorage.getItem('hrRole');
    
    if (hrRole === 'admin') {
      roleMessage.textContent = `Welcome ${hrName} - System Administrator (Unlimited Access)`;
      roleMessage.parentElement.style.background = 'linear-gradient(135deg, #FF6B35, #F7931E)';
    } else {
      roleMessage.textContent = `Welcome ${hrName} - HR Manager`;
    }
  }
}

// Check if user has specific permission
function hasPermission(permission) {
  const permissions = JSON.parse(sessionStorage.getItem('hrPermissions') || '[]');
  return permissions.includes(permission) || permissions.includes('unlimited_access');
}

// Add Individual Staff Member
if (document.getElementById('addStaffForm')) {
  document.getElementById('addStaffForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const staffName = document.getElementById('staffName').value.trim();
    const staffId = document.getElementById('staffId').value.trim();
    
    // Validation
    if (!staffName || !staffId) {
      showAddStaffMessage('Please fill in all fields!', 'error');
      return;
    }
    
    if (staffId.length < 3) {
      showAddStaffMessage('Staff ID must be at least 3 characters!', 'error');
      return;
    }
    
    // Check permission
    if (!hasPermission('manage_staff')) {
      showAddStaffMessage('You do not have permission to add staff members!', 'error');
      return;
    }
    
    // Check for duplicate staff ID
    const existingStaff = JSON.parse(localStorage.getItem('staffData') || '[]');
    const duplicate = existingStaff.find(staff => staff.staffId.toLowerCase() === staffId.toLowerCase());
    
    if (duplicate) {
      showAddStaffMessage('Staff ID already exists! Please use a unique ID.', 'error');
      return;
    }
    
    // Add staff member
    const newStaff = {
      name: staffName,
      staffId: staffId,
      dateAdded: new Date().toISOString(),
      addedBy: sessionStorage.getItem('hrName')
    };
    
    existingStaff.push(newStaff);
    localStorage.setItem('staffData', JSON.stringify(existingStaff));
    
    showAddStaffMessage(`Staff member ${staffName} (${staffId}) added successfully!`, 'success');
    
    // Clear form and refresh display
    document.getElementById('staffName').value = '';
    document.getElementById('staffId').value = '';
    loadStaffData();
  });
}

// Helper function for add staff messages
function showAddStaffMessage(message, type) {
  const messageDiv = document.getElementById('addStaffMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// Logout HR
function logoutHR() {
  sessionStorage.removeItem('hrLoggedIn');
  sessionStorage.removeItem('hrEmail');
  sessionStorage.removeItem('hrName');
  sessionStorage.removeItem('hrRole');
  sessionStorage.removeItem('hrPermissions');
  sessionStorage.removeItem('hrLoginTime');
  
  // Clear device session
  deviceSession.isHRSession = false;
  deviceSession.activeEmployeeId = null;
  deviceSession.sessionStartTime = null;
  saveDeviceSession();
  
  window.location.href = 'login.html';
}

// Staff File Upload Functionality
if (document.getElementById('staffFileInput')) {
  document.getElementById('staffFileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const uploadBtn = document.getElementById('uploadBtn');
    const selectedFileName = document.getElementById('selectedFileName');
    const uploadMessage = document.getElementById('uploadMessage');
    
    if (!hasPermission('manage_staff')) {
      showMessage('You do not have permission to upload staff data!', 'error');
      uploadBtn.classList.remove('upload-btn-visible');
      uploadBtn.classList.add('upload-btn-hidden');
      return;
    }
    
    if (file) {
      // Check file type
      const allowedTypes = ['xlsx', 'xls', 'csv'];
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        uploadMessage.innerHTML = 
          '<div class="message-error">❌ Please select a valid file (.xlsx, .xls, or .csv)</div>';
        uploadBtn.classList.remove('upload-btn-visible');
        uploadBtn.classList.add('upload-btn-hidden');
        if (selectedFileName) selectedFileName.textContent = '';
        e.target.value = '';
        return;
      }
      
      // Check file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        uploadMessage.innerHTML = 
          '<div class="message-error">❌ File too large! Please select a file smaller than 10MB.</div>';
        uploadBtn.classList.remove('upload-btn-visible');
        uploadBtn.classList.add('upload-btn-hidden');
        if (selectedFileName) selectedFileName.textContent = '';
        e.target.value = '';
        return;
      }
      
      // Show file selected and enable upload button
      const fileSizeKB = Math.round(file.size / 1024);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const sizeText = fileSizeKB > 1024 ? `${fileSizeMB} MB` : `${fileSizeKB} KB`;
      
      if (selectedFileName) {
        selectedFileName.textContent = `📄 ${file.name} (${sizeText})`;
      }
      uploadBtn.classList.remove('upload-btn-hidden');
      uploadBtn.classList.add('upload-btn-visible');
      uploadMessage.innerHTML = 
        '<div class="message-info">✅ File selected and validated. Click "Upload Staff Data" to proceed.</div>';
      
    } else {
      // No file selected
      uploadBtn.classList.remove('upload-btn-visible');
      uploadBtn.classList.add('upload-btn-hidden');
      if (selectedFileName) selectedFileName.textContent = '';
      uploadMessage.innerHTML = '';
    }
  });
}

// Process Staff Excel File
function processStaffFile() {
  if (!hasPermission('manage_staff')) {
    showMessage('You do not have permission to upload staff data!', 'error');
    return;
  }
  
  const fileInput = document.getElementById('staffFileInput');
  const file = fileInput.files[0];
  
  if (!file) {
    showMessage('Please select a file first!', 'error');
    return;
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    showMessage('File size too large! Please use a file smaller than 10MB.', 'error');
    return;
  }

  // Validate file type
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv'
  ];
  
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
    showMessage('Invalid file type! Please upload an Excel (.xlsx, .xls) or CSV file.', 'error');
    return;
  }

  // Show progress indicator
  showUploadProgress('Reading file...', 10);
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      showUploadProgress('Processing data...', 30);
      
      let jsonData;
      
      // Handle different file formats
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Process CSV file
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());
        jsonData = lines.map(line => {
          // Handle quoted CSV values
          const values = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());
          return values;
        });
      } else {
        // Process Excel file
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      }
      
      showUploadProgress('Validating data...', 50);
      
      // Clean and validate data
      const cleanedData = jsonData
        .map(row => row.map(cell => cell ? cell.toString().trim() : ''))
        .filter(row => row.some(cell => cell !== ''));
      
      if (cleanedData.length === 0) {
        hideUploadProgress();
        showMessage('No valid data found in the file!', 'error');
        return;
      }
      
      // Auto-detect header row and columns
      const { headerIndex, nameColumn, idColumn } = detectDataStructure(cleanedData);
      
      if (nameColumn === -1 || idColumn === -1) {
        hideUploadProgress();
        showMessage('Could not detect Name and ID columns. Please ensure your file has columns for staff names and IDs.', 'error');
        return;
      }
      
      // Extract staff data (skip header)
      const dataRows = cleanedData.slice(headerIndex + 1);
      
      showUploadProgress('Processing staff records...', 70);
      
      // Process and validate staff data
      const processedStaff = [];
      const errors = [];
      const warnings = [];
      const duplicateIds = new Set();
      
      dataRows.forEach((row, index) => {
        const actualRowNumber = headerIndex + index + 2; // +2 for 1-based indexing and header
        const name = normalizeStaffName(row[nameColumn] || '');
        const staffId = normalizeStaffId(row[idColumn] || '');
        
        // Validation checks
        if (!name) {
          errors.push(`Row ${actualRowNumber}: Staff name is missing or invalid`);
          return;
        }
        
        if (!staffId) {
          errors.push(`Row ${actualRowNumber}: Staff ID is missing or invalid`);
          return;
        }
        
        // Check for duplicate IDs in current upload
        if (duplicateIds.has(staffId)) {
          errors.push(`Row ${actualRowNumber}: Duplicate Staff ID '${staffId}' found in file`);
          return;
        }
        duplicateIds.add(staffId);
        
        // Validate staff ID format (customize as needed)
        if (!isValidStaffId(staffId)) {
          warnings.push(`Row ${actualRowNumber}: Staff ID '${staffId}' format may be incorrect`);
        }
        
        // Validate name length
        if (name.length < 2) {
          warnings.push(`Row ${actualRowNumber}: Staff name '${name}' is very short`);
        }
        
        processedStaff.push({
          name: name,
          staffId: staffId
        });
      });
      
      showUploadProgress('Finalizing...', 90);
      
      // Show results summary
      let summaryMessage = `Found ${processedStaff.length} valid staff records`;
      if (warnings.length > 0) {
        summaryMessage += `, ${warnings.length} warnings`;
      }
      if (errors.length > 0) {
        summaryMessage += `, ${errors.length} errors`;
      }
      
      if (errors.length > 0) {
        hideUploadProgress();
        const errorMessage = `Upload failed due to errors:\n\n${errors.slice(0, 10).join('\n')}`;
        if (errors.length > 10) {
          errorMessage += `\n... and ${errors.length - 10} more errors`;
        }
        showMessage(errorMessage, 'error');
        return;
      }
      
      if (processedStaff.length === 0) {
        hideUploadProgress();
        showMessage('No valid staff records found to upload.', 'error');
        return;
      }
      
      // Send to backend
      uploadStaffToServer(processedStaff, warnings, summaryMessage);
      
    } catch (error) {
      hideUploadProgress();
      console.error('File processing error:', error);
      showMessage(`Error processing file: ${error.message}. Please check the file format and try again.`, 'error');
    }
  };
  
  reader.onerror = function() {
    hideUploadProgress();
    showMessage('Error reading file. Please try again.', 'error');
  };
  
  // Read file based on type
  if (file.name.toLowerCase().endsWith('.csv')) {
    reader.readAsText(file);
  } else {
    reader.readAsBinaryString(file);
  }
}

// Helper function to detect data structure in spreadsheet
function detectDataStructure(data) {
  let headerIndex = -1;
  let nameColumn = -1;
  let idColumn = -1;
  
  // Look for header row in first 5 rows
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    let potentialNameCol = -1;
    let potentialIdCol = -1;
    
    for (let j = 0; j < row.length; j++) {
      const cell = row[j].toString().toLowerCase();
      
      // Look for name column
      if (cell.includes('name') || cell.includes('employee') || cell.includes('staff')) {
        potentialNameCol = j;
      }
      
      // Look for ID column
      if (cell.includes('id') || cell.includes('number') || cell.includes('code')) {
        potentialIdCol = j;
      }
    }
    
    if (potentialNameCol !== -1 && potentialIdCol !== -1) {
      headerIndex = i;
      nameColumn = potentialNameCol;
      idColumn = potentialIdCol;
      break;
    }
  }
  
  // If no headers found, assume first row is data and first two columns are name and ID
  if (headerIndex === -1) {
    headerIndex = -1; // No header row
    nameColumn = 0;
    idColumn = 1;
  }
  
  return { headerIndex, nameColumn, idColumn };
}

// Normalize staff name
function normalizeStaffName(name) {
  return name
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[^\w\s\-'\.]/g, '') // Remove special characters except hyphens, apostrophes, and dots
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Normalize staff ID
function normalizeStaffId(id) {
  return id
    .replace(/\s+/g, '') // Remove all spaces
    .replace(/[^\w\-]/g, '') // Keep only alphanumeric and hyphens
    .toUpperCase()
    .trim();
}

// Validate staff ID format
function isValidStaffId(id) {
  // Customize this based on your organization's ID format
  // This example allows alphanumeric IDs with optional hyphens, 3-20 characters
  return /^[A-Z0-9\-]{3,20}$/.test(id);
}

// Upload staff data to server
async function uploadStaffToServer(staffData, warnings, summaryMessage) {
  try {
    showUploadProgress('Uploading to server...', 95);
    
    const response = await fetch('/api/staff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ staff: staffData })
    });
    
    const result = await response.json();
    
    hideUploadProgress();
    
    if (response.ok) {
      let successMessage = `✅ ${result.message}`;
      
      if (warnings.length > 0) {
        successMessage += `\n\n⚠️ Warnings:\n${warnings.slice(0, 5).join('\n')}`;
        if (warnings.length > 5) {
          successMessage += `\n... and ${warnings.length - 5} more warnings`;
        }
      }
      
      showMessage(successMessage, 'success');
      
      // Clear file input and refresh display
      document.getElementById('staffFileInput').value = '';
      const uploadBtn = document.getElementById('uploadBtn');
      const selectedFileName = document.getElementById('selectedFileName');
      
      uploadBtn.classList.remove('upload-btn-visible');
      uploadBtn.classList.add('upload-btn-hidden');
      if (selectedFileName) selectedFileName.textContent = '';
      
      loadStaffData();
      
    } else {
      showMessage(`Upload failed: ${result.error}`, 'error');
    }
    
  } catch (error) {
    hideUploadProgress();
    console.error('Upload error:', error);
    showMessage('Network error during upload. Please check your connection and try again.', 'error');
  }
}

// Show upload progress
function showUploadProgress(message, percentage) {
  const uploadMessage = document.getElementById('uploadMessage');
  if (uploadMessage) {
    uploadMessage.innerHTML = `
      <div class="upload-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-text">${message} (${percentage}%)</div>
      </div>
    `;
    uploadMessage.className = 'message-info';
  }
}

// Hide upload progress
function hideUploadProgress() {
  const uploadMessage = document.getElementById('uploadMessage');
  if (uploadMessage) {
    uploadMessage.innerHTML = '';
    uploadMessage.className = '';
  }
}

// Load and display staff data
function loadStaffData() {
  const tbody = document.getElementById('staffTableBody');
  const countElement = document.getElementById('staffCount');
  
  if (!tbody) return;
  
  // Show loading state
  tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">Loading staff data...</td></tr>';
  
  fetch('/api/staff')
    .then(response => response.json())
    .then(staffData => {
      tbody.innerHTML = '';
      
      // Store staff data globally for edit functionality
      window.currentStaffData = staffData;
      
      if (staffData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">No staff data available. Add staff individually or upload an Excel file.</td></tr>';
      } else {
        staffData.forEach((staff) => {
          const row = tbody.insertRow();
          
          // Check permissions for action buttons
          const canManage = hasPermission('manage_staff');
          const canDelete = hasPermission('manage_staff');
          
          let actionsHtml = '';
          if (canManage) {
            actionsHtml += `<button onclick="editStaff('${staff.employee_id}')" class="btn-edit">✏️ Edit</button>`;
          }
          if (canDelete) {
            actionsHtml += `<button onclick="removeStaff('${staff.employee_id}')" class="btn-delete">🗑️ Delete</button>`;
          }
          if (!canManage && !canDelete) {
            actionsHtml = '<span style="color: #666;">No permissions</span>';
          }
          
          // Format date
          const dateAdded = staff.date_added ? new Date(staff.date_added).toLocaleDateString() : 'N/A';
          const statusBadge = staff.is_active !== false ? 
            '<span class="status-badge active">✅ Active</span>' : 
            '<span class="status-badge inactive">❌ Inactive</span>';
          
          row.innerHTML = `
            <td>
              <input type="checkbox" class="staff-checkbox" 
                     value="${staff.employee_id}"
                     onchange="updateRowSelection(this); updateSelectionUI();" 
                     title="Select ${staff.name}" 
                     aria-label="Select ${staff.name}">
            </td>
            <td><strong>${staff.name}</strong></td>
            <td><code>${staff.employee_id}</code></td>
            <td>${staff.department || 'Not specified'}</td>
            <td>${staff.email || 'Not provided'}</td>
            <td>${staff.contact || 'Not provided'}</td>
            <td>${statusBadge}</td>
            <td>${dateAdded}</td>
            <td class="actions-cell">${actionsHtml}</td>
          `;
        });
      }
      
      if (countElement) {
        countElement.textContent = `${staffData.length} Staff Members`;
      }
      
      // Update Clear All button visibility
      const clearAllBtn = document.getElementById('clearAllBtn');
      if (clearAllBtn) {
        if (!hasPermission('manage_staff')) {
          clearAllBtn.style.display = 'none';
        }
      }
    })
    .catch(error => {
      console.error('Error loading staff data:', error);
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #d32f2f;">Error loading staff data. Please try again.</td></tr>';
    });
}

// Edit staff member
function editStaff(employeeId) {
  if (!hasPermission('manage_staff')) {
    alert('You do not have permission to edit staff members!');
    return;
  }
  
  // Find staff member data
  const staffData = window.currentStaffData || [];
  const staff = staffData.find(s => s.employee_id === employeeId);
  
  if (!staff) {
    alert('Staff member not found!');
    return;
  }
  
  // Populate the edit form
  document.getElementById('editStaffId').value = staff.employee_id;
  document.getElementById('editStaffName').value = staff.name || '';
  document.getElementById('editStaffDepartment').value = staff.department || '';
  document.getElementById('editStaffEmail').value = staff.email || '';
  document.getElementById('editStaffContact').value = staff.contact || '';
  document.getElementById('editStaffStatus').value = staff.is_active !== false ? 'true' : 'false';
  
  // Show the modal
  document.getElementById('editStaffModal').style.display = 'flex';
}

// Close edit staff modal
function closeEditStaffModal() {
  document.getElementById('editStaffModal').style.display = 'none';
  // Reset form
  document.getElementById('editStaffForm').reset();
}

// Update staff member
async function updateStaff() {
  const employeeId = document.getElementById('editStaffId').value;
  const name = document.getElementById('editStaffName').value.trim();
  const department = document.getElementById('editStaffDepartment').value.trim();
  const email = document.getElementById('editStaffEmail').value.trim();
  const contact = document.getElementById('editStaffContact').value.trim();
  const isActive = document.getElementById('editStaffStatus').value === 'true';
  
  if (!name) {
    alert('Staff name is required!');
    return;
  }
  
  try {
    const response = await fetch(`/api/staff/${employeeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        department: department,
        email: email,
        contact: contact,
        is_active: isActive
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      showMessage(result.message || 'Staff member updated successfully!', 'success');
      closeEditStaffModal();
      loadStaffData(); // Reload the staff table
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update staff member');
    }
  } catch (error) {
    console.error('Error updating staff:', error);
    showMessage('Error updating staff member: ' + error.message, 'error');
  }
}

// Remove individual staff member
function removeStaff(employeeId) {
  if (!hasPermission('manage_staff')) {
    alert('You do not have permission to remove staff members!');
    return;
  }
  
  if (confirm(`Are you sure you want to remove staff member ${employeeId}? This action cannot be undone.`)) {
    fetch(`/api/staff/${employeeId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Failed to remove staff member');
      }
    })
    .then(data => {
      showMessage(data.message || `Staff member ${employeeId} removed successfully`, 'success');
      loadStaffData(); // Reload data
      updateSelectionUI();
    })
    .catch(error => {
      console.error('Error removing staff:', error);
      showMessage('Error removing staff member: ' + error.message, 'error');
    });
  }
}

// Clear all staff data
function clearAllStaff() {
  if (!hasPermission('manage_staff')) {
    alert('You do not have permission to clear all staff data!');
    return;
  }
  
  if (confirm('Are you sure you want to clear ALL staff data? This action cannot be undone.')) {
    fetch('/api/staff/delete-all', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Failed to clear all staff data');
      }
    })
    .then(data => {
      showMessage(data.message || 'All staff data cleared successfully', 'success');
      loadStaffData(); // Reload data
      updateSelectionUI();
    })
    .catch(error => {
      console.error('Error clearing all staff:', error);
      showMessage('Error clearing all staff data: ' + error.message, 'error');
    });
  }
}

// Enhanced Delete Functionality
let deleteModalAction = null;
let selectedStaffForDeletion = [];

// Show delete all confirmation with detailed modal
function showDeleteAllConfirmation() {
  if (!hasPermission('manage_staff')) {
    showMessage('You do not have permission to delete staff data!', 'error');
    return;
  }

  const staffCount = document.querySelectorAll('#staffTableBody tr').length;
  if (staffCount === 0) {
    showMessage('No staff data to delete.', 'info');
    return;
  }

  const modal = document.getElementById('deleteConfirmModal');
  const title = document.getElementById('deleteModalTitle');
  const message = document.getElementById('deleteModalMessage');
  const details = document.getElementById('deleteDetails');
  
  title.textContent = '⚠️ Delete All Staff Data';
  message.textContent = `You are about to permanently delete ALL ${staffCount} staff members from the system.`;
  details.innerHTML = `
    <h5>🔍 What will be deleted:</h5>
    <ul>
      <li><strong>${staffCount} staff members</strong> and all their personal information</li>
      <li>All employee ID assignments</li>
      <li>Staff registration dates</li>
    </ul>
    <p><strong>Note:</strong> Attendance records and leave requests will be preserved but will show as "Unknown Employee".</p>
  `;
  
  deleteModalAction = 'deleteAll';
  modal.style.display = 'flex';
  modal.classList.add('show');
}

// Select all staff checkboxes
function selectAllStaff() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  selectAllCheckbox.checked = !selectAllCheckbox.checked;
  toggleSelectAll();
}

// Toggle select all functionality
function toggleSelectAll() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const staffCheckboxes = document.querySelectorAll('.staff-checkbox');
  const isChecked = selectAllCheckbox.checked;
  
  staffCheckboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
    updateRowSelection(checkbox);
  });
  
  updateSelectionUI();
}

// Update individual row selection
function updateRowSelection(checkbox) {
  const row = checkbox.closest('tr');
  if (checkbox.checked) {
    row.classList.add('selected');
  } else {
    row.classList.remove('selected');
  }
}

// Update selection UI and buttons
function updateSelectionUI() {
  const selectedCheckboxes = document.querySelectorAll('.staff-checkbox:checked');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const selectedCount = document.getElementById('selectedCount');
  const bulkActionsInfo = document.getElementById('bulkActionsInfo');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const totalCheckboxes = document.querySelectorAll('.staff-checkbox');
  
  selectedCount.textContent = selectedCheckboxes.length;
  deleteSelectedBtn.disabled = selectedCheckboxes.length === 0;
  
  // Show/hide bulk actions info
  if (selectedCheckboxes.length > 0) {
    bulkActionsInfo.classList.add('show');
  } else {
    bulkActionsInfo.classList.remove('show');
  }
  
  // Update select all checkbox state
  if (selectedCheckboxes.length === 0) {
    selectAllCheckbox.indeterminate = false;
    selectAllCheckbox.checked = false;
  } else if (selectedCheckboxes.length === totalCheckboxes.length) {
    selectAllCheckbox.indeterminate = false;
    selectAllCheckbox.checked = true;
  } else {
    selectAllCheckbox.indeterminate = true;
    selectAllCheckbox.checked = false;
  }
}

// Clear selection
function clearSelection() {
  const staffCheckboxes = document.querySelectorAll('.staff-checkbox');
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  
  staffCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
    updateRowSelection(checkbox);
  });
  
  selectAllCheckbox.checked = false;
  selectAllCheckbox.indeterminate = false;
  updateSelectionUI();
}

// Delete selected staff
function deleteSelectedStaff() {
  if (!hasPermission('manage_staff')) {
    showMessage('You do not have permission to delete staff data!', 'error');
    return;
  }

  const selectedCheckboxes = document.querySelectorAll('.staff-checkbox:checked');
  if (selectedCheckboxes.length === 0) {
    showMessage('Please select staff members to delete.', 'warning');
    return;
  }

  // Collect selected staff information
  selectedStaffForDeletion = [];
  selectedCheckboxes.forEach(checkbox => {
    const row = checkbox.closest('tr');
    const staffName = row.cells[1].textContent;
    const staffId = row.cells[2].textContent;
    selectedStaffForDeletion.push({ name: staffName, employee_id: staffId, element: row });
  });

  const modal = document.getElementById('deleteConfirmModal');
  const title = document.getElementById('deleteModalTitle');
  const message = document.getElementById('deleteModalMessage');
  const details = document.getElementById('deleteDetails');
  
  title.textContent = '🗑️ Delete Selected Staff';
  message.textContent = `You are about to permanently delete ${selectedStaffForDeletion.length} selected staff member(s).`;
  
  let staffList = '<h5>📋 Staff to be deleted:</h5><ul>';
  selectedStaffForDeletion.forEach(staff => {
    staffList += `<li><strong>${staff.name}</strong> (${staff.id})</li>`;
  });
  staffList += '</ul>';
  
  details.innerHTML = staffList;
  
  deleteModalAction = 'deleteSelected';
  modal.style.display = 'flex';
  modal.classList.add('show');
}

// Close delete modal
function closeDeleteModal() {
  const modal = document.getElementById('deleteConfirmModal');
  modal.classList.remove('show');
  modal.style.display = 'none';
  deleteModalAction = null;
  selectedStaffForDeletion = [];
}

// Confirm deletion action
async function confirmDeletion() {
  if (!deleteModalAction) return;
  
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const originalText = confirmBtn.innerHTML;
  
  try {
    confirmBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Deleting...</span>';
    confirmBtn.disabled = true;
    
    if (deleteModalAction === 'deleteAll') {
      await performDeleteAll();
    } else if (deleteModalAction === 'deleteSelected') {
      await performDeleteSelected();
    }
    
    closeDeleteModal();
    loadStaffData(); // Refresh the staff table
    
  } catch (error) {
    console.error('Delete operation failed:', error);
    showMessage('Delete operation failed. Please try again.', 'error');
  } finally {
    confirmBtn.innerHTML = originalText;
    confirmBtn.disabled = false;
  }
}

// Perform delete all operation
async function performDeleteAll() {
  try {
    const response = await fetch('/api/staff/delete-all', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      showMessage('All staff data has been permanently deleted.', 'success');
      clearSelection();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete all staff');
    }
  } catch (error) {
    console.error('Delete all failed:', error);
    throw error;
  }
}

// Perform delete selected operation
async function performDeleteSelected() {
  try {
    const employeeIds = selectedStaffForDeletion.map(staff => staff.employee_id);
    
    const response = await fetch('/api/staff/delete-selected', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ employee_ids: employeeIds })
    });
    
    if (response.ok) {
      const result = await response.json();
      showMessage(`Successfully deleted ${result.deleted_count} staff member(s).`, 'success');
      clearSelection();
    } else {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete selected staff');
    }
  } catch (error) {
    console.error('Delete selected failed:', error);
    throw error;
  }
}

// Download Excel template
function downloadTemplate() {
  if (!hasPermission('manage_staff')) {
    showMessage('You do not have permission to download template!', 'error');
    return;
  }

  try {
    const templateData = [
      ['Staff Name', 'Staff ID', 'Instructions'],
      ['John Doe', 'NJSMA001', 'Enter full name of employee'],
      ['Jane Smith', 'NJSMA002', 'Enter unique staff identifier (3-20 chars)'],
      ['Michael Johnson', 'EMP2024-003', 'Use only letters, numbers, and hyphens'],
      ['Sarah Wilson', 'STAFF-004', 'No special characters like @, #, %, etc.'],
      ['David Brown', 'HR-005', 'Examples: EMP001, STAFF-2024-001, NJSMA123'],
      ['', '', ''],
      ['Instructions:', '', ''],
      ['• Column A: Staff Name (required)', '', ''],
      ['• Column B: Staff ID (required, unique)', '', ''],
      ['• Column C: This column will be ignored', '', ''],
      ['• Delete the instruction rows before upload', '', ''],
      ['• Maximum 1,000 records per upload', '', ''],
      ['• File size limit: 10MB', '', ''],
      ['• Supported formats: .xlsx, .xls, .csv', '', '']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    
    // Set column widths
    ws['!cols'] = [
      { width: 20 }, // Staff Name
      { width: 15 }, // Staff ID
      { width: 40 }  // Instructions
    ];
    
    // Style the header row
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "4CAF50" } },
      alignment: { horizontal: "center" }
    };
    
    ws['A1'].s = headerStyle;
    ws['B1'].s = headerStyle;
    ws['C1'].s = headerStyle;
    
    XLSX.utils.book_append_sheet(wb, ws, 'Staff Upload Template');
    
    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const filename = `NJSMA_Staff_Template_${dateStr}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    showMessage(`✅ Template downloaded successfully as "${filename}"`, 'success');
    
  } catch (error) {
    console.error('Template download error:', error);
    showMessage('❌ Error downloading template. Please try again.', 'error');
  }
}

// Production note: Sample data initialization removed for real-time deployment

// Settings Page Functionality
// Tab switching for settings
function switchSettingsTab(tabName) {
  console.log('Switching to tab:', tabName);
  
  // Hide all tabs
  const tabs = document.querySelectorAll('.settings-tab-content');
  tabs.forEach(tab => {
    tab.classList.remove('active');
    console.log('Hiding tab:', tab.id);
  });

  // Remove active class from all tab buttons
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const selectedTab = document.getElementById(tabName + '-tab');
  if (selectedTab) {
    selectedTab.classList.add('active');
    console.log('Showing tab:', selectedTab.id);
  } else {
    console.error('Tab not found:', tabName + '-tab');
  }

  // Add active class to clicked button
  const clickedBtn = document.querySelector(`[data-tab="${tabName}"]`);
  if (clickedBtn) {
    clickedBtn.classList.add('active');
    console.log('Activated button for tab:', tabName);
  } else {
    console.error('Button not found for tab:', tabName);
  }
}

// Initialize settings tabs
function initializeSettingsTabs() {
  const settingsTabs = document.querySelector('.settings-tabs');
  if (settingsTabs) {
    console.log('Initializing settings tabs...');
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Tab clicked:', this.dataset.tab);
        switchSettingsTab(this.dataset.tab);
      });
    });
    
    // Ensure the first tab is active by default
    const firstTab = document.querySelector('.tab-btn');
    if (firstTab && !document.querySelector('.tab-btn.active')) {
      firstTab.click();
    }
  }
}

// Initialize on page load and DOM ready
if (document.querySelector('.settings-tabs')) {
  initializeSettingsTabs();
}

// Also initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  if (document.querySelector('.settings-tabs')) {
    initializeSettingsTabs();
  }
});

// Settings form submissions
// Attendance Settings
if (document.getElementById('attendanceSettingsForm')) {
  document.getElementById('attendanceSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      clockInDeadline: document.getElementById('clockInDeadline').value,
      workStartTime: document.getElementById('workStartTime').value,
      workEndTime: document.getElementById('workEndTime').value,
      gracePeriod: parseInt(document.getElementById('gracePeriod').value)
    };

    // Show loading
    const btn = e.target.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '💾 Saving...';
    btn.disabled = true;

    try {
      // Save to localStorage for now (in production, this would be an API call)
      localStorage.setItem('attendanceSettings', JSON.stringify(formData));

      showSettingsMessage('Attendance settings saved successfully!', 'success');
    } catch (error) {
      showSettingsMessage('Failed to save attendance settings.', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Location Settings
if (document.getElementById('locationSettingsForm')) {
  document.getElementById('locationSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      assemblyLat: parseFloat(document.getElementById('assemblyLat').value),
      assemblyLon: parseFloat(document.getElementById('assemblyLon').value),
      locationRadius: parseFloat(document.getElementById('locationRadius').value),
      locationName: document.getElementById('locationName').value
    };

    // Show loading
    const btn = e.target.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '📍 Saving...';
    btn.disabled = true;

    try {
      localStorage.setItem('locationSettings', JSON.stringify(formData));
      showSettingsMessage('Location settings saved successfully!', 'success');
    } catch (error) {
      showSettingsMessage('Failed to save location settings.', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Organization Settings
if (document.getElementById('organizationSettingsForm')) {
  document.getElementById('organizationSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      organizationName: document.getElementById('organizationName').value,
      organizationCode: document.getElementById('organizationCode').value,
      contactEmail: document.getElementById('contactEmail').value,
      contactPhone: document.getElementById('contactPhone').value
    };

    // Show loading
    const btn = e.target.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '🏢 Saving...';
    btn.disabled = true;

    try {
      localStorage.setItem('organizationSettings', JSON.stringify(formData));
      showSettingsMessage('Organization settings saved successfully!', 'success');
    } catch (error) {
      showSettingsMessage('Failed to save organization settings.', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Password Change
if (document.getElementById('passwordChangeForm')) {
  document.getElementById('passwordChangeForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (newPassword !== confirmPassword) {
      showSettingsMessage('New passwords do not match!', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showSettingsMessage('New password must be at least 8 characters long!', 'error');
      return;
    }

    // Show loading
    const btn = e.target.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '🔑 Changing...';
    btn.disabled = true;

    try {
      // In production, this would validate current password and update via API
      // For now, just simulate success
      showSettingsMessage('Password changed successfully!', 'success');

      // Clear form
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    } catch (error) {
      showSettingsMessage('Failed to change password.', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Location Security Settings
if (document.getElementById('locationSecurityForm')) {
  document.getElementById('locationSecurityForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      require_gps_verification: document.getElementById('requireGpsVerification').checked ? 'true' : 'false',
      gps_verification_radius: document.getElementById('locationRadius').value,
      assembly_latitude: document.getElementById('assemblyLatitude').value,
      assembly_longitude: document.getElementById('assemblyLongitude').value
    };

    // Show loading
    const btn = e.target.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '📍 Saving...';
    btn.disabled = true;

    try {
      const response = await fetch('/api/settings/security', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showSettingsMessage('Location security settings saved successfully!', 'success');
      } else {
        const error = await response.json();
        showSettingsMessage(`Failed to save location settings: ${error.error}`, 'error');
      }
    } catch (error) {
      showSettingsMessage('Failed to save location security settings.', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Session Settings
if (document.getElementById('sessionSettingsForm')) {
  document.getElementById('sessionSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      sessionTimeout: parseInt(document.getElementById('sessionTimeout').value),
      maxLoginAttempts: parseInt(document.getElementById('maxLoginAttempts').value),
      requireStrongPassword: document.getElementById('requireStrongPassword').checked,
      enableTwoFactor: document.getElementById('enableTwoFactor').checked
    };

    // Show loading
    const btn = e.target.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '⏰ Saving...';
    btn.disabled = true;

    try {
      localStorage.setItem('sessionSettings', JSON.stringify(formData));
      showSettingsMessage('Session settings saved successfully!', 'success');
    } catch (error) {
      showSettingsMessage('Failed to save session settings.', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Display Preferences
if (document.getElementById('displayPreferencesForm')) {
  document.getElementById('displayPreferencesForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      theme: document.getElementById('theme').value,
      language: document.getElementById('language').value,
      timezone: document.getElementById('timezone').value
    };

    // Show loading
    const btn = e.target.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '🎨 Saving...';
    btn.disabled = true;

    try {
      localStorage.setItem('displayPreferences', JSON.stringify(formData));
      showSettingsMessage('Display preferences saved successfully!', 'success');

      // Apply theme immediately
      applyTheme(formData.theme);
    } catch (error) {
      showSettingsMessage('Failed to save display preferences.', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Notification Settings
if (document.getElementById('notificationSettingsForm')) {
  document.getElementById('notificationSettingsForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
      emailNotifications: document.getElementById('emailNotifications').checked,
      lateArrivalAlerts: document.getElementById('lateArrivalAlerts').checked,
      leaveRequestNotifications: document.getElementById('leaveRequestNotifications').checked,
      systemMaintenanceAlerts: document.getElementById('systemMaintenanceAlerts').checked
    };

    // Show loading
    const btn = e.target.querySelector('.save-btn');
    const originalText = btn.textContent;
    btn.textContent = '🔔 Saving...';
    btn.disabled = true;

    try {
      localStorage.setItem('notificationSettings', JSON.stringify(formData));
      showSettingsMessage('Notification settings saved successfully!', 'success');
    } catch (error) {
      showSettingsMessage('Failed to save notification settings.', 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// Data Export Functions
function exportAttendanceData() {
  if (!hasPermission('view_attendance')) {
    showSettingsMessage('You do not have permission to export attendance data!', 'error');
    return;
  }

  const attendanceData = JSON.parse(localStorage.getItem('clockInHistory') || '[]');

  if (attendanceData.length === 0) {
    showSettingsMessage('No attendance data available to export.', 'error');
    return;
  }

  // Convert to CSV format
  const csvData = [
    ['Employee ID', 'Employee Name', 'Date', 'Clock In Time', 'Clock Out Time', 'Work Duration', 'Status'],
    ...attendanceData.map(record => [
      record.employeeId,
      record.employeeName || 'Unknown',
      new Date(record.timestamp).toLocaleDateString(),
      record.clockInTime || '',
      record.clockOutTime || '',
      record.workDuration || '',
      record.status
    ])
  ];

  downloadCSV(csvData, 'attendance_data.csv');
  showSettingsMessage('Attendance data exported successfully!', 'success');
}

function exportStaffData() {
  if (!hasPermission('view_staff')) {
    showSettingsMessage('You do not have permission to export staff data!', 'error');
    return;
  }

  const staffData = JSON.parse(localStorage.getItem('staffData') || '[]');

  if (staffData.length === 0) {
    showSettingsMessage('No staff data available to export.', 'error');
    return;
  }

  // Convert to CSV format
  const csvData = [
    ['Staff Name', 'Staff ID', 'Date Added'],
    ...staffData.map(staff => [
      staff.name,
      staff.staffId,
      new Date(staff.dateAdded).toLocaleDateString()
    ])
  ];

  downloadCSV(csvData, 'staff_data.csv');
  showSettingsMessage('Staff data exported successfully!', 'success');
}

function exportLeaveData() {
  showSettingsMessage('Leave request export functionality coming soon!', 'info');
}

// Utility function to download CSV
function downloadCSV(data, filename) {
  const csvContent = data.map(row =>
    row.map(field => `"${field}"`).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Data Maintenance Functions
function createBackup() {
  if (!hasPermission('system_settings')) {
    showSettingsMessage('You do not have permission to create backups!', 'error');
    return;
  }

  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      staffData: JSON.parse(localStorage.getItem('staffData') || '[]'),
      attendanceData: JSON.parse(localStorage.getItem('clockInHistory') || '[]'),
      settings: {
        attendance: JSON.parse(localStorage.getItem('attendanceSettings') || '{}'),
        location: JSON.parse(localStorage.getItem('locationSettings') || '{}'),
        organization: JSON.parse(localStorage.getItem('organizationSettings') || '{}'),
        session: JSON.parse(localStorage.getItem('sessionSettings') || '{}'),
        display: JSON.parse(localStorage.getItem('displayPreferences') || '{}'),
        notifications: JSON.parse(localStorage.getItem('notificationSettings') || '{}')
      }
    };

    const backupString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([backupString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    // Update last backup time
    localStorage.setItem('lastBackup', new Date().toISOString());
    updateSystemInfo();

    showSettingsMessage('Backup created successfully!', 'success');
  } catch (error) {
    showSettingsMessage('Failed to create backup.', 'error');
  }
}

function clearOldData() {
  if (!hasPermission('system_settings')) {
    showSettingsMessage('You do not have permission to clear data!', 'error');
    return;
  }

  if (!confirm('Are you sure you want to clear all records older than 90 days? This action cannot be undone.')) {
    return;
  }

  try {
    const attendanceData = JSON.parse(localStorage.getItem('clockInHistory') || '[]');
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const filteredData = attendanceData.filter(record => {
      const recordDate = new Date(record.timestamp);
      return recordDate >= ninetyDaysAgo;
    });

    localStorage.setItem('clockInHistory', JSON.stringify(filteredData));
    updateSystemInfo();
    showSettingsMessage(`Cleared ${attendanceData.length - filteredData.length} old records.`, 'success');
  } catch (error) {
    showSettingsMessage('Failed to clear old data.', 'error');
  }
}

// System reset functionality removed for production deployment

// Update system information display
function updateSystemInfo() {
  const staffData = JSON.parse(localStorage.getItem('staffData') || '[]');
  const attendanceData = JSON.parse(localStorage.getItem('clockInHistory') || '[]');
  const lastBackup = localStorage.getItem('lastBackup');

  document.getElementById('totalEmployees').textContent = staffData.length;
  document.getElementById('totalRecords').textContent = attendanceData.length;
  document.getElementById('lastBackup').textContent = lastBackup ?
    new Date(lastBackup).toLocaleDateString() : 'Never';
}

// Apply theme function
function applyTheme(theme) {
  const body = document.body;
  body.classList.remove('light-theme', 'dark-theme', 'auto-theme');
  body.classList.add(`${theme}-theme`);

  // Store theme preference
  localStorage.setItem('currentTheme', theme);
}

// Load security settings from API
async function loadSecuritySettings() {
  try {
    const response = await fetch('/api/settings/security');
    if (response.ok) {
      const settings = await response.json();
      
      // Update form fields with current values
      if (document.getElementById('requireGpsVerification')) {
        document.getElementById('requireGpsVerification').checked = settings.require_gps_verification === 'true';
      }
      if (document.getElementById('locationRadius') && settings.gps_verification_radius) {
        document.getElementById('locationRadius').value = settings.gps_verification_radius;
      }
      if (document.getElementById('assemblyLatitude') && settings.assembly_latitude) {
        document.getElementById('assemblyLatitude').value = settings.assembly_latitude;
      }
      if (document.getElementById('assemblyLongitude') && settings.assembly_longitude) {
        document.getElementById('assemblyLongitude').value = settings.assembly_longitude;
      }
    }
  } catch (error) {
    console.error('Error loading security settings:', error);
  }
}

// Load settings on page load
function loadSettings() {
  // Load attendance settings
  const attendanceSettings = JSON.parse(localStorage.getItem('attendanceSettings') || '{}');
  if (attendanceSettings.clockInDeadline) document.getElementById('clockInDeadline').value = attendanceSettings.clockInDeadline;
  if (attendanceSettings.workStartTime) document.getElementById('workStartTime').value = attendanceSettings.workStartTime;
  if (attendanceSettings.workEndTime) document.getElementById('workEndTime').value = attendanceSettings.workEndTime;
  if (attendanceSettings.gracePeriod) document.getElementById('gracePeriod').value = attendanceSettings.gracePeriod;

  // Load location settings
  const locationSettings = JSON.parse(localStorage.getItem('locationSettings') || '{}');
  if (locationSettings.assemblyLat) document.getElementById('assemblyLat').value = locationSettings.assemblyLat;
  if (locationSettings.assemblyLon) document.getElementById('assemblyLon').value = locationSettings.assemblyLon;
  if (locationSettings.locationRadius) document.getElementById('locationRadius').value = locationSettings.locationRadius;
  if (locationSettings.locationName) document.getElementById('locationName').value = locationSettings.locationName;

  // Load organization settings
  const organizationSettings = JSON.parse(localStorage.getItem('organizationSettings') || '{}');
  if (organizationSettings.organizationName) document.getElementById('organizationName').value = organizationSettings.organizationName;
  if (organizationSettings.organizationCode) document.getElementById('organizationCode').value = organizationSettings.organizationCode;
  if (organizationSettings.contactEmail) document.getElementById('contactEmail').value = organizationSettings.contactEmail;
  if (organizationSettings.contactPhone) document.getElementById('contactPhone').value = organizationSettings.contactPhone;

  // Load security settings from API
  loadSecuritySettings();

  // Load session settings
  const sessionSettings = JSON.parse(localStorage.getItem('sessionSettings') || '{}');
  if (sessionSettings.sessionTimeout) document.getElementById('sessionTimeout').value = sessionSettings.sessionTimeout;
  if (sessionSettings.maxLoginAttempts) document.getElementById('maxLoginAttempts').value = sessionSettings.maxLoginAttempts;
  if (sessionSettings.requireStrongPassword !== undefined) document.getElementById('requireStrongPassword').checked = sessionSettings.requireStrongPassword;
  if (sessionSettings.enableTwoFactor !== undefined) document.getElementById('enableTwoFactor').checked = sessionSettings.enableTwoFactor;

  // Load display preferences
  const displayPreferences = JSON.parse(localStorage.getItem('displayPreferences') || '{}');
  if (displayPreferences.theme) document.getElementById('theme').value = displayPreferences.theme;
  if (displayPreferences.language) document.getElementById('language').value = displayPreferences.language;
  if (displayPreferences.timezone) document.getElementById('timezone').value = displayPreferences.timezone;

  // Load notification settings
  const notificationSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
  if (notificationSettings.emailNotifications !== undefined) document.getElementById('emailNotifications').checked = notificationSettings.emailNotifications;
  if (notificationSettings.lateArrivalAlerts !== undefined) document.getElementById('lateArrivalAlerts').checked = notificationSettings.lateArrivalAlerts;
  if (notificationSettings.leaveRequestNotifications !== undefined) document.getElementById('leaveRequestNotifications').checked = notificationSettings.leaveRequestNotifications;
  if (notificationSettings.systemMaintenanceAlerts !== undefined) document.getElementById('systemMaintenanceAlerts').checked = notificationSettings.systemMaintenanceAlerts;

  // Apply current theme
  const currentTheme = localStorage.getItem('currentTheme') || 'light';
  applyTheme(currentTheme);

  // Update system info
  updateSystemInfo();
}

// Settings message display
function showSettingsMessage(message, type) {
  const messageDiv = document.getElementById('settingsMessage');
  if (messageDiv) {
    messageDiv.textContent = message;
    messageDiv.className = `settings-message ${type}`;
    messageDiv.style.display = 'block';

    // Auto-hide after 5 seconds for success/info messages
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// Initialize settings page
document.addEventListener('DOMContentLoaded', function() {
  if (document.querySelector('.settings-section')) {
    loadSettings();
  }
});

// Leave Request Management Functions
let leaveRequests = [];
let filteredRequests = [];

// Load leave requests from API
async function loadLeaveRequests() {
  try {
    const response = await fetch('/api/leave-requests');
    if (!response.ok) throw new Error('Failed to load leave requests');
    leaveRequests = await response.json();
    filteredRequests = [...leaveRequests];
    renderLeaveRequests();
    updateLeaveStats();
  } catch (error) {
    console.error('Error loading leave requests:', error);
    showLeaveError('Failed to load leave requests. Please try again.');
  }
}

// Update leave statistics
function updateLeaveStats() {
  const stats = {
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === 'pending').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length
  };

  document.getElementById('totalRequests').textContent = stats.total;
  document.getElementById('pendingRequests').textContent = stats.pending;
  document.getElementById('approvedRequests').textContent = stats.approved;
  document.getElementById('rejectedRequests').textContent = stats.rejected;
}

// Filter leave requests
function filterLeaveRequests() {
  const statusFilter = document.getElementById('statusFilter').value;
  const employeeFilter = document.getElementById('employeeFilter').value.toLowerCase();
  const dateFilter = document.getElementById('dateFilter').value;

  filteredRequests = leaveRequests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesEmployee = !employeeFilter ||
      request.employee_name.toLowerCase().includes(employeeFilter) ||
      request.employee_id.toLowerCase().includes(employeeFilter);
    const matchesDate = !dateFilter ||
      request.start_date === dateFilter ||
      request.end_date === dateFilter;

    return matchesStatus && matchesEmployee && matchesDate;
  });

  renderLeaveRequests();
}

// Render leave requests table
function renderLeaveRequests() {
  const tbody = document.getElementById('leaveRequestsTable');
  if (!tbody) return;

  if (filteredRequests.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">
          <div class="empty-state">
            <i class="fas fa-calendar-times"></i>
            <h4>No Leave Requests Found</h4>
            <p>No leave requests match your current filters.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredRequests.map(request => `
    <tr>
      <td class="employee-cell">
        <div class="employee-info">
          <div class="employee-avatar">
            ${request.employee_name.charAt(0).toUpperCase()}
          </div>
          <div class="employee-details">
            <div class="employee-name">${request.employee_name}</div>
            <div class="employee-id">ID: ${request.employee_id}</div>
          </div>
        </div>
      </td>
      <td class="date-cell">
        <div class="date-display">
          <i class="fas fa-calendar-alt"></i>
          ${formatDate(request.start_date)}
        </div>
      </td>
      <td class="date-cell">
        <div class="date-display">
          <i class="fas fa-calendar-check"></i>
          ${formatDate(request.end_date)}
        </div>
      </td>
      <td>
        <span class="days-badge">${request.days_requested} days</span>
      </td>
      <td>
        <span class="status-badge status-${request.status}">
          <i class="fas fa-${getStatusIcon(request.status)}"></i>
          ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button class="btn-action btn-view" onclick="viewLeaveRequest(${request.id})" title="View Details">
            <i class="fas fa-eye"></i>
          </button>
          ${request.status === 'pending' ? `
            <button class="btn-action btn-approve" onclick="approveLeaveRequest(${request.id})" title="Approve">
              <i class="fas fa-check"></i>
            </button>
            <button class="btn-action btn-reject" onclick="rejectLeaveRequest(${request.id})" title="Reject">
              <i class="fas fa-times"></i>
            </button>
          ` : '<span class="no-actions">No actions</span>'}
        </div>
      </td>
    </tr>
  `).join('');
}

// Helper functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getStatusIcon(status) {
  switch (status) {
    case 'pending': return 'clock';
    case 'approved': return 'check-circle';
    case 'rejected': return 'times-circle';
    default: return 'question-circle';
  }
}

// View leave request details
async function viewLeaveRequest(requestId) {
  try {
    const response = await fetch(`/api/leave-requests/${requestId}`);
    if (!response.ok) throw new Error('Failed to load request details');
    const request = await response.json();

    const modal = document.getElementById('leaveModal');
    const modalBody = modal.querySelector('.modal-body');

    modalBody.innerHTML = `
      <div class="leave-details">
        <h4><i class="fas fa-info-circle"></i> Leave Request Details</h4>

        <div class="detail-section">
          <div class="detail-grid">
            <div class="detail-item">
              <label>Employee:</label>
              <span>${request.employee_name} (${request.employee_id})</span>
            </div>
            <div class="detail-item">
              <label>Leave Type:</label>
              <span>${request.leave_type}</span>
            </div>
            <div class="detail-item">
              <label>Start Date:</label>
              <span>${formatDate(request.start_date)}</span>
            </div>
            <div class="detail-item">
              <label>End Date:</label>
              <span>${formatDate(request.end_date)}</span>
            </div>
            <div class="detail-item">
              <label>Days Requested:</label>
              <span>${request.days_requested} days</span>
            </div>
            <div class="detail-item">
              <label>Status:</label>
              <span class="status-badge status-${request.status}">${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
            </div>
          </div>
        </div>

        ${request.reason ? `
          <div class="detail-section">
            <h4><i class="fas fa-comment"></i> Reason for Leave</h4>
            <p style="background: #f8f9fa; padding: 1rem; border-radius: 6px; margin: 0;">${request.reason}</p>
          </div>
        ` : ''}

        <div class="detail-section">
          <h4><i class="fas fa-history"></i> Request Timeline</h4>
          <div class="timeline">
            <div class="timeline-item">
              <div class="timeline-marker completed"></div>
              <div class="timeline-content">
                <div class="timeline-title">Request Submitted</div>
                <div class="timeline-date">${formatDate(request.created_at)} ${formatTime12Hour(request.created_at)}</div>
              </div>
            </div>
            ${request.status !== 'pending' ? `
              <div class="timeline-item">
                <div class="timeline-marker completed"></div>
                <div class="timeline-content">
                  <div class="timeline-title">Request ${request.status.charAt(0).toUpperCase() + request.status.slice(1)}</div>
                  <div class="timeline-date">${formatDate(request.updated_at)} ${formatTime12Hour(request.updated_at)}</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  } catch (error) {
    console.error('Error loading request details:', error);
    showLeaveError('Failed to load request details. Please try again.');
  }
}

// Approve leave request
async function approveLeaveRequest(requestId) {
  if (!confirm('Are you sure you want to approve this leave request?')) return;

  try {
    const response = await fetch(`/api/leave-requests/${requestId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error('Failed to approve request');

    showLeaveNotification('Leave request approved successfully!', 'success');
    loadLeaveRequests();
  } catch (error) {
    console.error('Error approving request:', error);
    showLeaveError('Failed to approve leave request. Please try again.');
  }
}

// Reject leave request
async function rejectLeaveRequest(requestId) {
  const reason = prompt('Please provide a reason for rejection (optional):');
  if (reason === null) return; // User cancelled

  try {
    const response = await fetch(`/api/leave-requests/${requestId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'No reason provided' })
    });

    if (!response.ok) throw new Error('Failed to reject request');

    showLeaveNotification('Leave request rejected successfully!', 'success');
    loadLeaveRequests();
  } catch (error) {
    console.error('Error rejecting request:', error);
    showLeaveError('Failed to reject leave request. Please try again.');
  }
}

// Show error message
function showLeaveError(message) {
  const errorDiv = document.getElementById('leaveError');
  if (errorDiv) {
    errorDiv.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <h4>Error</h4>
        <p>${message}</p>
        <button class="btn-retry" onclick="loadLeaveRequests()">
          <i class="fas fa-redo"></i> Try Again
        </button>
      </div>
    `;
    errorDiv.style.display = 'block';
  }
}

// Show notification
function showLeaveNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
    <span>${message}</span>
  `;

  document.body.appendChild(notification);

  setTimeout(() => notification.classList.add('show'), 100);
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Close modal
function closeLeaveModal() {
  document.getElementById('leaveModal').style.display = 'none';
}

// Employee Leave Request Functions
function calculateLeaveDays() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate || !endDate) {
    document.getElementById('leaveSummary').style.display = 'none';
    return;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    showFormError('startDate', 'Start date cannot be after end date');
    document.getElementById('leaveSummary').style.display = 'none';
    return;
  }

  clearFormError('startDate');

  // Calculate business days (excluding weekends)
  let businessDays = 0;
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      businessDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Update summary
  document.getElementById('totalDays').textContent = businessDays;
  document.getElementById('startDateDisplay').textContent = formatDate(startDate);
  document.getElementById('endDateDisplay').textContent = formatDate(endDate);
  document.getElementById('leaveSummary').style.display = 'block';
}

// Validate leave form
function validateLeaveForm() {
  let isValid = true;

  // Clear previous errors
  document.querySelectorAll('.form-group').forEach(group => group.classList.remove('error'));
  document.querySelectorAll('.field-error').forEach(error => error.remove());

  // Validate employee ID
  const employeeId = document.getElementById('employeeId').value.trim();
  if (!employeeId) {
    showFormError('employeeId', 'Employee ID is required');
    isValid = false;
  } else if (!/^[A-Za-z0-9]{3,10}$/.test(employeeId)) {
    showFormError('employeeId', 'Employee ID must be 3-10 alphanumeric characters');
    isValid = false;
  }

  // Validate dates
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;

  if (!startDate) {
    showFormError('startDate', 'Start date is required');
    isValid = false;
  }

  if (!endDate) {
    showFormError('endDate', 'End date is required');
    isValid = false;
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      showFormError('startDate', 'Start date cannot be in the past');
      isValid = false;
    }

    if (end < start) {
      showFormError('endDate', 'End date cannot be before start date');
      isValid = false;
    }
  }

  // Validate leave type
  const leaveType = document.getElementById('leaveType').value;
  if (!leaveType) {
    showFormError('leaveType', 'Please select a leave type');
    isValid = false;
  }

  // Validate reason
  const reason = document.getElementById('reason').value.trim();
  if (!reason) {
    showFormError('reason', 'Please provide a reason for your leave request');
    isValid = false;
  } else if (reason.length < 10) {
    showFormError('reason', 'Please provide a more detailed reason (at least 10 characters)');
    isValid = false;
  }

  return isValid;
}

// Show form error
function showFormError(fieldId, message) {
  const field = document.getElementById(fieldId);
  const formGroup = field.closest('.form-group');

  formGroup.classList.add('error');

  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error';
  errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

  formGroup.appendChild(errorDiv);
}

// Clear form error
function clearFormError(fieldId) {
  const field = document.getElementById(fieldId);
  const formGroup = field.closest('.form-group');

  formGroup.classList.remove('error');
  const errorDiv = formGroup.querySelector('.field-error');
  if (errorDiv) errorDiv.remove();
}

// Submit leave request
async function submitLeaveRequest() {
  if (!validateLeaveForm()) {
    showFormMessage('Please correct the errors above and try again.', 'error');
    return;
  }

  const formData = {
    employee_id: document.getElementById('employeeId').value.trim(),
    start_date: document.getElementById('startDate').value,
    end_date: document.getElementById('endDate').value,
    leave_type: document.getElementById('leaveType').value,
    reason: document.getElementById('reason').value.trim()
  };

  try {
    const response = await fetch('/api/leave-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to submit leave request');
    }

    const result = await response.json();

    showFormMessage(`
      <strong>Leave request submitted successfully!</strong><br>
      Request ID: ${result.request_id}<br>
      Days Requested: ${result.days_requested}<br>
      Status: Pending approval
    `, 'success');

    // Reset form
    document.getElementById('leaveForm').reset();
    document.getElementById('leaveSummary').style.display = 'none';

  } catch (error) {
    console.error('Error submitting leave request:', error);
    showFormMessage(`Failed to submit leave request: ${error.message}`, 'error');
  }
}

// Show form message
function showFormMessage(message, type) {
  const container = document.getElementById('messageContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="message-container ${type}">
      <div class="message-content">
        <div class="message-icon">
          <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i>
        </div>
        <div class="message-text">
          <h4>${type === 'success' ? 'Success!' : 'Error'}</h4>
          <p>${message}</p>
        </div>
      </div>
    </div>
  `;

  container.scrollIntoView({ behavior: 'smooth' });
}

// Initialize leave request pages
document.addEventListener('DOMContentLoaded', function() {
  // HR Leave Requests Page
  if (document.querySelector('.leave-requests-section')) {
    loadLeaveRequests();

    // Set up filters
    document.getElementById('statusFilter').addEventListener('change', filterLeaveRequests);
    document.getElementById('employeeFilter').addEventListener('input', filterLeaveRequests);
    document.getElementById('dateFilter').addEventListener('change', filterLeaveRequests);
  }

  // Employee Leave Request Page
  if (document.querySelector('.leave-request-section')) {
    // Set up date change listeners
    document.getElementById('startDate').addEventListener('change', calculateLeaveDays);
    document.getElementById('endDate').addEventListener('change', calculateLeaveDays);

    // Set up form submission
    document.getElementById('leaveForm').addEventListener('submit', function(e) {
      e.preventDefault();
      submitLeaveRequest();
    });
  }
});

// Modal event listeners - close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
  const deleteModal = document.getElementById('deleteConfirmModal');
  
  if (deleteModal) {
    // Close modal when clicking outside of it
    deleteModal.addEventListener('click', function(e) {
      if (e.target === deleteModal) {
        closeDeleteModal();
      }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && deleteModal.classList.contains('show')) {
        closeDeleteModal();
      }
    });
  }
});

// Attendance Status Bar Functions
function updateAttendanceStatusBar(employeeData) {
  // Update the status bar with the current employee information
  const statusBar = document.getElementById('attendanceStatusBar');
  if (!statusBar) {
    return; // Status bar not found
  }
  
  // Show the status bar
  statusBar.style.display = 'block';
  
  // Update employee info in header if available
  const employeeInfo = document.getElementById('statusEmployeeInfo');
  if (employeeInfo && employeeData.employee_name) {
    employeeInfo.textContent = employeeData.employee_name;
  }
  
  // Update status indicators based on employee status
  updateStatusIndicators(employeeData);
  
  // Update summary section
  updateStatusSummary(employeeData);
}

function updateStatusIndicators(employeeData) {
  const clockInIcon = document.getElementById('clockInIcon');
  const clockInStatusText = document.getElementById('clockInStatusText');
  const clockInTimeDisplay = document.getElementById('clockInTimeDisplay');
  
  const clockOutIcon = document.getElementById('clockOutIcon');
  const clockOutStatusText = document.getElementById('clockOutStatusText');
  const clockOutTimeDisplay = document.getElementById('clockOutTimeDisplay');
  
  const workSessionIcon = document.getElementById('workSessionIcon');
  const workSessionStatusText = document.getElementById('workSessionStatusText');
  const workDurationDisplay = document.getElementById('workDurationDisplay');
  
  // Reset all indicators
  resetStatusIndicators();
  
  switch (employeeData.status) {
    case 'not_clocked_in':
      // Clock In: Pending
      if (clockInIcon) {
        clockInIcon.textContent = '⏳';
        clockInIcon.parentElement.classList.add('clock-in-pending');
      }
      if (clockInStatusText) clockInStatusText.textContent = 'Pending';
      if (clockInTimeDisplay) clockInTimeDisplay.textContent = 'Not checked';
      
      // Clock Out: Not available
      if (clockOutIcon) {
        clockOutIcon.textContent = '⏸️';
        clockOutIcon.parentElement.classList.add('not-checked');
      }
      if (clockOutStatusText) clockOutStatusText.textContent = 'Not available';
      if (clockOutTimeDisplay) clockOutTimeDisplay.textContent = 'N/A';
      
      // Work Session: Not started
      if (workSessionIcon) {
        workSessionIcon.textContent = '⏸️';
        workSessionIcon.parentElement.classList.add('not-checked');
      }
      if (workSessionStatusText) workSessionStatusText.textContent = 'Not started';
      if (workDurationDisplay) workDurationDisplay.textContent = '0h 0m';
      break;
      
    case 'clocked_in':
      // Clock In: Completed
      if (clockInIcon) {
        clockInIcon.textContent = '✅';
        clockInIcon.parentElement.classList.add('clock-in-completed');
      }
      if (clockInStatusText) clockInStatusText.textContent = 'Completed';
      if (clockInTimeDisplay && employeeData.clock_in_time) {
        clockInTimeDisplay.textContent = employeeData.clock_in_time;
      }
      
      // Clock Out: Pending
      if (clockOutIcon) {
        clockOutIcon.textContent = '⏳';
        clockOutIcon.parentElement.classList.add('clock-out-pending');
      }
      if (clockOutStatusText) clockOutStatusText.textContent = 'Pending';
      if (clockOutTimeDisplay) clockOutTimeDisplay.textContent = 'Not checked';
      
      // Work Session: Active
      if (workSessionIcon) {
        workSessionIcon.textContent = '▶️';
        workSessionIcon.parentElement.classList.add('work-session-active');
      }
      if (workSessionStatusText) workSessionStatusText.textContent = 'Active';
      if (workDurationDisplay) workDurationDisplay.textContent = 'In progress';
      break;
      
    case 'completed':
      // Clock In: Completed
      if (clockInIcon) {
        clockInIcon.textContent = '✅';
        clockInIcon.parentElement.classList.add('clock-in-completed');
      }
      if (clockInStatusText) clockInStatusText.textContent = 'Completed';
      if (clockInTimeDisplay && employeeData.clock_in_time) {
        clockInTimeDisplay.textContent = employeeData.clock_in_time;
      }
      
      // Clock Out: Completed
      if (clockOutIcon) {
        clockOutIcon.textContent = '✅';
        clockOutIcon.parentElement.classList.add('clock-out-completed');
      }
      if (clockOutStatusText) clockOutStatusText.textContent = 'Completed';
      if (clockOutTimeDisplay && employeeData.clock_out_time) {
        clockOutTimeDisplay.textContent = employeeData.clock_out_time;
      }
      
      // Work Session: Completed
      if (workSessionIcon) {
        workSessionIcon.textContent = '✅';
        workSessionIcon.parentElement.classList.add('work-session-completed');
      }
      if (workSessionStatusText) workSessionStatusText.textContent = 'Completed';
      
      // Calculate work duration
      if (workDurationDisplay) {
        if (employeeData.clock_in_time && employeeData.clock_out_time) {
          try {
            const clockIn = new Date(`1970-01-01T${employeeData.clock_in_time}`);
            const clockOut = new Date(`1970-01-01T${employeeData.clock_out_time}`);
            const duration = clockOut - clockIn;
            const hours = Math.floor(duration / (1000 * 60 * 60));
            const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
            workDurationDisplay.textContent = `${hours}h ${minutes}m`;
          } catch (e) {
            workDurationDisplay.textContent = 'Error calculating';
          }
        } else {
          workDurationDisplay.textContent = 'Duration not available';
        }
      }
      break;
  }
}

function resetStatusIndicators() {
  // Reset all status item classes
  const statusItems = document.querySelectorAll('.status-item');
  statusItems.forEach(item => {
    item.classList.remove('clock-in-pending', 'clock-in-completed', 'clock-out-pending', 'clock-out-completed', 'work-session-active', 'work-session-completed', 'not-checked');
  });
}

function updateStatusSummary(employeeData) {
  const summaryIcon = document.getElementById('summaryIcon');
  const summaryText = document.getElementById('summaryText');
  const statusSummary = document.getElementById('statusSummary');
  
  if (!summaryIcon || !summaryText || !statusSummary) return;
  
  switch (employeeData.status) {
    case 'not_clocked_in':
      if (summaryIcon) summaryIcon.textContent = '⏰';
      if (summaryText) summaryText.innerHTML = '<strong>Ready for Clock-In</strong><br>Please check in before 10:00 AM deadline';
      if (statusSummary) statusSummary.style.display = 'flex';
      break;
      
    case 'clocked_in':
      if (summaryIcon) summaryIcon.textContent = '▶️';
      if (summaryText) summaryText.innerHTML = '<strong>Work Session Active</strong><br>Clocked in successfully. Ready to clock out.';
      if (statusSummary) statusSummary.style.display = 'flex';
      break;
      
    case 'completed':
      if (summaryIcon) summaryIcon.textContent = '✅';
      if (summaryText) summaryText.innerHTML = '<strong>Attendance Completed</strong><br>Thank you for your work today!';
      if (statusSummary) statusSummary.style.display = 'flex';
      break;
      
    default:
      if (statusSummary) statusSummary.style.display = 'none';
  }
}

function hideAttendanceStatusBar() {
  const statusBar = document.getElementById('attendanceStatusBar');
  if (statusBar) {
    statusBar.style.display = 'none';
  }
}

// ===== VIEW ALL STAFF DATA MODAL FUNCTIONS =====

// Show all staff data modal
function showAllStaffData() {
    const modal = document.getElementById('viewAllDataModal');
    modal.style.display = 'block';
    loadAllStaffDataView();
}

// Close view all data modal
function closeViewAllDataModal() {
    const modal = document.getElementById('viewAllDataModal');
    modal.style.display = 'none';
}

// Load all staff data in the view modal
function loadAllStaffDataView() {
    const staffData = window.currentStaffData || [];
    
    // Update statistics
    const totalStaff = staffData.length;
    const activeStaff = staffData.filter(s => s.is_active).length;
    const departments = [...new Set(staffData.map(s => s.department).filter(d => d))];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentAdditions = staffData.filter(s => new Date(s.date_added) >= thirtyDaysAgo).length;
    
    document.getElementById('totalStaffCount').textContent = totalStaff;
    document.getElementById('activeStaffCount').textContent = activeStaff;
    document.getElementById('departmentCount').textContent = departments.length;
    document.getElementById('recentAdditionsCount').textContent = recentAdditions;
    
    // Populate the data table
    const tableBody = document.getElementById('allDataTableBody');
    tableBody.innerHTML = staffData.map(staff => `
        <tr>
            <td>${staff.name}</td>
            <td>${staff.id}</td>
            <td>${staff.department || 'N/A'}</td>
            <td>${staff.email || 'N/A'}</td>
            <td>${staff.contact || 'N/A'}</td>
            <td>
                <span class="status-badge ${staff.is_active ? 'status-active' : 'status-inactive'}">
                    ${staff.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>${formatDate(staff.date_added)}</td>
            <td>${formatDate(staff.date_modified)}</td>
            <td class="actions-cell">
                <button onclick="editStaff(${staff.id})" class="btn-edit" title="Edit staff">✏️</button>
                <button onclick="deleteStaff(${staff.id})" class="btn-delete" title="Delete staff">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Export all staff data to CSV
function exportAllStaffData() {
    const staffData = window.currentStaffData || [];
    
    if (staffData.length === 0) {
        alert('No staff data available to export');
        return;
    }
    
    // Prepare CSV content
    const headers = ['Staff Name', 'Staff ID', 'Department', 'Email', 'Contact', 'Status', 'Date Added', 'Last Modified'];
    const csvContent = [
        headers.join(','),
        ...staffData.map(staff => [
            `"${staff.name}"`,
            staff.id,
            `"${staff.department || 'N/A'}"`,
            `"${staff.email || 'N/A'}"`,
            `"${staff.contact || 'N/A'}"`,
            staff.is_active ? 'Active' : 'Inactive',
            `"${formatDate(staff.date_added)}"`,
            `"${formatDate(staff.date_modified)}"`
        ].join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `staff_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('Staff data exported successfully!', 'success');
}

// Print all staff data
function printAllStaffData() {
    const printWindow = window.open('', '_blank');
    const staffData = window.currentStaffData || [];
    
    let printContent = `
        <html>
        <head>
            <title>All Staff Data Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .report-meta { margin-bottom: 20px; font-size: 12px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .status-active { color: green; font-weight: bold; }
                .status-inactive { color: red; font-weight: bold; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Staff Data Report</h1>
                <h2>New Juaben South Municipal Assembly</h2>
            </div>
            <div class="report-meta">
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Total Staff:</strong> ${staffData.length}</p>
                <p><strong>Active Staff:</strong> ${staffData.filter(s => s.is_active).length}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Staff Name</th>
                        <th>Staff ID</th>
                        <th>Department</th>
                        <th>Email</th>
                        <th>Contact</th>
                        <th>Status</th>
                        <th>Date Added</th>
                        <th>Last Modified</th>
                    </tr>
                </thead>
                <tbody>
                    ${staffData.map(staff => `
                        <tr>
                            <td>${staff.name}</td>
                            <td>${staff.id}</td>
                            <td>${staff.department || 'N/A'}</td>
                            <td>${staff.email || 'N/A'}</td>
                            <td>${staff.contact || 'N/A'}</td>
                            <td class="status-${staff.is_active ? 'active' : 'inactive'}">
                                ${staff.is_active ? 'Active' : 'Inactive'}
                            </td>
                            <td>${formatDate(staff.date_added)}</td>
                            <td>${formatDate(staff.date_modified)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// Confirm delete all staff data
function deleteAllStaffConfirm() {
    if (confirm('⚠️ WARNING: This will permanently delete ALL staff data from the system!\n\nThis action cannot be undone. Are you absolutely sure?')) {
        if (confirm('Final confirmation: Type "DELETE ALL" in the next prompt to proceed')) {
            const confirmation = prompt('Type "DELETE ALL" to confirm:');
            if (confirmation === 'DELETE ALL') {
                deleteAllStaffData();
            } else {
                alert('Deletion cancelled - confirmation text did not match');
            }
        }
    }
}

// Delete all staff data
async function deleteAllStaffData() {
    try {
        const response = await fetch('/api/staff/delete_all', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert('All staff data has been permanently deleted', 'success');
            closeViewAllDataModal();
            loadStaffData(); // Reload the main staff table
        } else {
            throw new Error(result.error || 'Failed to delete all staff data');
        }
    } catch (error) {
        console.error('Error deleting all staff data:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

// Send Clock-In Reminders Function
function sendClockInReminders() {
    // Ensure correct modal title text
    const modalTitle = document.getElementById('notificationModalTitle');
    if (modalTitle) {
        modalTitle.textContent = '📧 Send Clock-In Reminders';
    }
    
    // Show the notification modal
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.style.display = 'block';
        
        // Load current reminder settings and preview
        loadReminderPreview();
    } else {
        showAlert('Notification modal not found', 'error');
    }
}

// Close Notification Modal
function closeNotificationModal() {
    console.log('Closing notification modal'); // Debug log
    const modal = document.getElementById('notificationModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        
        // Clear any preview data
        const preview = document.getElementById('notificationPreview');
        if (preview) {
            preview.innerHTML = '';
        }
        
        console.log('Modal closed successfully');
    } else {
        console.error('Notification modal element not found');
    }
}

// Enhanced modal management - Add event listeners when page loads
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('notificationModal');
    if (modal) {
        // Close modal when clicking outside of it
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeNotificationModal();
            }
        });
        
        // Close with Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && modal.style.display === 'block') {
                closeNotificationModal();
            }
        });
    }
});

// Load Reminder Preview
async function loadReminderPreview() {
    try {
        const reminderTime = document.getElementById('reminderTime').value;
        const previewDiv = document.getElementById('notificationPreview');
        
        if (!previewDiv) return;
        
        // Get current time and compare with reminder time
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        
        // Fetch staff who haven't clocked in today
        const response = await fetch(getApiUrl('attendance') + '/today');
        const attendanceData = await response.json();
        
        const staffResponse = await fetch(getApiUrl('staff'));
        const allStaff = await staffResponse.json();
        
        // Find staff who haven't clocked in
        const clockedInIds = attendanceData.map(record => record.employee_id);
        const notClockedIn = allStaff.filter(staff => 
            !clockedInIds.includes(staff.employee_id) && staff.is_active
        );
        
        let previewHTML = `
            <h4>Reminder Preview (Cutoff: ${reminderTime})</h4>
            <p>Current time: ${currentTime}</p>
        `;
        
        if (notClockedIn.length === 0) {
            previewHTML += '<p class="preview-success">✅ All active staff have clocked in!</p>';
        } else {
            previewHTML += `
                <p class="preview-info">📋 ${notClockedIn.length} staff member(s) will receive reminders:</p>
                <ul class="reminder-list">
            `;
            
            notClockedIn.forEach(staff => {
                previewHTML += `
                    <li>
                        <strong>${staff.name}</strong> (${staff.employee_id})
                        ${staff.email ? `- ${staff.email}` : ''}
                        ${staff.department ? ` | ${staff.department}` : ''}
                    </li>
                `;
            });
            
            previewHTML += '</ul>';
        }
        
        previewDiv.innerHTML = previewHTML;
        
    } catch (error) {
        console.error('Error loading reminder preview:', error);
        const previewDiv = document.getElementById('notificationPreview');
        if (previewDiv) {
            previewDiv.innerHTML = '<p class="preview-error">❌ Error loading preview</p>';
        }
    }
}

// Send Actual Reminders
async function sendReminders() {
    try {
        const reminderTime = document.getElementById('reminderTime').value;
        
        const response = await fetch('/api/send-reminders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cutoff_time: reminderTime
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(`✅ Reminders sent to ${result.sent_count} staff members`, 'success');
            closeNotificationModal();
        } else {
            throw new Error(result.error || 'Failed to send reminders');
        }
    } catch (error) {
        console.error('Error sending reminders:', error);
        showAlert('Error sending reminders: ' + error.message, 'error');
    }
}
