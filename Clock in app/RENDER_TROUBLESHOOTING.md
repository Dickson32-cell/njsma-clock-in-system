# 🚀 Render Deployment Troubleshooting Guide

## Login Issues on Render - Quick Fix Steps

### 1. **Check API Connection**
```javascript
// Open browser console on your Render site and run:
console.log('Current URL:', window.location.origin);
console.log('API Base URL should be:', window.location.origin);

// Test API connection:
fetch(window.location.origin + '/api/staff')
  .then(r => r.json())
  .then(data => console.log('Staff API works:', data))
  .catch(err => console.error('API Error:', err));
```

### 2. **Common Issues & Solutions**

#### **Issue A: "Failed to fetch" errors**
- **Cause**: CORS or network connectivity
- **Solution**: Check if your Render app URL is correct and accessible

#### **Issue B: "Staff ID not found" for valid IDs**
- **Cause**: Database not populated or API not responding
- **Solution**: Use test API script or check sample data

#### **Issue C: Login works locally but not on Render**
- **Cause**: API URL configuration issue
- **Solution**: Verify API base URL detection

### 3. **Test API Endpoints**

Run this command with your Render URL:
```bash
python test_api.py https://your-app-name.onrender.com
```

### 4. **Sample Test Staff IDs**
Try logging in with these pre-loaded staff IDs:
- `NJSMA001` (John Doe)
- `staff001` (Test Staff One)
- `admin` (System Administrator)
- `hr001` (HR Manager)
- `emp001` (Employee One)

### 5. **HR Login Credentials**
**Email**: `maxwellackerson@gmail.com`  
**Password**: `Ophon@100`

**Email**: `dicksonapam@gmail.com`  
**Password**: `K0248847819o`

### 6. **Debug Steps in Browser**

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Try staff login and watch for errors**
4. **Check Network tab for failed requests**

### 7. **Manual API Test**
```javascript
// Test staff login API directly:
fetch(window.location.origin + '/api/staff/NJSMA001')
  .then(response => {
    console.log('Status:', response.status);
    return response.json();
  })
  .then(data => console.log('Response:', data))
  .catch(error => console.error('Error:', error));
```

### 8. **Render-Specific Checks**

1. **Verify Build Success**: Check Render dashboard for successful deployment
2. **Check Logs**: View Render logs for any Python errors
3. **Environment Variables**: Ensure DATABASE_URL is set if using PostgreSQL
4. **Port Configuration**: Render should auto-detect Flask app on port 5000

### 9. **Quick Fix Commands**

If you have access to Render dashboard:
1. **Trigger Manual Deploy**: Redeploy the latest commit
2. **Check Service Logs**: Look for startup errors
3. **Restart Service**: Sometimes a restart fixes connection issues

### 10. **Emergency Fallback**

If login still doesn't work, add this temporary debug code to `scripts.js`:

```javascript
// Temporary debug - add after API_CONFIG
window.DEBUG_MODE = true;
if (window.DEBUG_MODE) {
  console.log('Debug mode enabled');
  console.log('API Configuration:', API_CONFIG);
}
```

---

## ✅ Success Indicators

When working correctly, you should see:
- **Console**: No fetch errors
- **Network tab**: API calls returning 200 status
- **Staff login**: Redirects to dashboard after login
- **HR login**: Redirects to HR dashboard

## ❌ Failure Indicators

If these appear, there's an issue:
- **Console**: "Failed to fetch" errors
- **Network tab**: Requests failing with CORS errors
- **Login**: Gets stuck on "Logging In..." forever
- **Error messages**: "Cannot connect to server"

---

**Need Help?** 
1. Run the test script: `python test_api.py https://your-app.onrender.com`
2. Check browser console for specific error messages
3. Verify your Render app is running in the dashboard