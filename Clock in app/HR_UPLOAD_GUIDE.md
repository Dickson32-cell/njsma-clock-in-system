# HR Staff Upload Guide

## 📋 Complete Guide for Uploading Staff Data

This guide will help HR personnel upload staff data using Excel or CSV files without encountering errors.

### 🚀 Quick Start

1. **Access Staff Management**: Go to HR Dashboard → Staff Management
2. **Download Template**: Click "Download Template" for a properly formatted Excel file
3. **Prepare Your Data**: Fill in staff names and IDs in the template
4. **Upload File**: Select your file and click "Upload Staff Data"

### 📁 Supported File Formats

#### Excel Files (.xlsx, .xls)
- **Automatic Detection**: The system automatically detects Name and ID columns
- **Flexible Layout**: Headers can be in any of the first 5 rows
- **Column Names**: Looks for columns containing:
  - **Name**: "name", "employee", "staff"
  - **ID**: "id", "number", "code"

#### CSV Files (.csv)
- **Fixed Layout**: First column = Staff Name, Second column = Staff ID
- **Comma Separated**: Use commas to separate values
- **Text Encoding**: UTF-8 recommended

### ✅ Data Validation Rules

#### Staff Names
- **Length**: 2-100 characters
- **Format**: Automatically capitalized (John Doe)
- **Characters**: Letters, spaces, hyphens, apostrophes, and dots allowed
- **Cleaning**: Multiple spaces reduced to single spaces

#### Staff IDs
- **Length**: 3-20 characters
- **Format**: Uppercase letters, numbers, and hyphens only
- **Examples**: 
  - ✅ Valid: `NJSMA001`, `EMP-2024-001`, `STAFF123`, `HR-005`
  - ❌ Invalid: `EMP@123`, `A#1`, `ST` (too short)

### 📊 File Limits

- **File Size**: Maximum 10MB
- **Records**: Maximum 1,000 staff records per upload
- **Duplicates**: System prevents duplicate Staff IDs

### 🔧 Upload Process

#### Step 1: File Validation
- File type and size checking
- Format validation
- Real-time feedback

#### Step 2: Data Processing
- Automatic header detection
- Data cleaning and normalization
- Validation of each record

#### Step 3: Server Upload
- Secure transfer to database
- Duplicate handling
- Progress tracking

#### Step 4: Results Summary
- Added, updated, and skipped counts
- Error and warning reports
- Success confirmation

### 🛠️ Common Issues and Solutions

#### "File too large" Error
- **Cause**: File exceeds 10MB limit
- **Solution**: Split data into smaller files or compress images/formatting

#### "Invalid file type" Error
- **Cause**: Unsupported file format
- **Solution**: Save as .xlsx, .xls, or .csv format

#### "Could not detect columns" Error
- **Cause**: Unusual column names or layout
- **Solution**: Use the downloaded template or ensure columns contain "name" and "id"

#### "Duplicate Staff ID" Error
- **Cause**: Same ID used multiple times
- **Solution**: Ensure all Staff IDs are unique

#### "Staff ID format incorrect" Warning
- **Cause**: ID contains special characters or unusual format
- **Solution**: Use only letters, numbers, and hyphens

### 📝 Best Practices

#### Data Preparation
1. **Use Templates**: Always start with the downloaded template
2. **Clean Data**: Remove extra spaces, special characters
3. **Consistent Format**: Use same ID pattern (e.g., NJSMA001, NJSMA002)
4. **Backup**: Keep original data files as backup

#### Upload Strategy
1. **Test Small**: Upload a few records first to test format
2. **Batch Upload**: For large datasets, upload in batches of 500-1000
3. **Verify Results**: Check the staff list after each upload
4. **Handle Errors**: Address any errors before proceeding

#### Data Quality
1. **Complete Names**: Use full names (First Last)
2. **Unique IDs**: Ensure no duplicate staff IDs
3. **Consistent Format**: Follow organization's ID format
4. **Validate**: Double-check data before upload

### 🔍 Troubleshooting Guide

#### Upload Fails Completely
1. Check internet connection
2. Verify file format and size
3. Try refreshing the page
4. Contact system administrator

#### Some Records Skipped
1. Review error messages in upload results
2. Fix invalid Staff IDs or names
3. Remove duplicate entries
4. Re-upload corrected records

#### Slow Upload
1. Check file size (larger files take longer)
2. Ensure stable internet connection
3. Upload during off-peak hours
4. Consider splitting into smaller batches

### 🎯 Tips for Success

#### Data Entry Tips
- **Names**: "John Doe" not "john doe" or "JOHN DOE"
- **IDs**: "NJSMA001" not "njsma001" or "NJSMA-001"
- **Consistency**: Use same format throughout

#### File Management
- **Naming**: Use descriptive names like "Staff_Upload_2024_Jan.xlsx"
- **Versions**: Keep track of different versions
- **Backup**: Always backup original data

#### Quality Control
- **Preview**: Review data before upload
- **Validate**: Check for obvious errors
- **Test**: Upload a small sample first

### 📞 Support

If you encounter persistent issues:

1. **Check this guide** for common solutions
2. **Review error messages** carefully
3. **Try the template** if having format issues
4. **Contact IT support** with specific error messages
5. **Provide sample data** (anonymized) for troubleshooting

### 🔄 Update Process

For updating existing staff records:
- **Same Staff ID**: System will update the name if changed
- **New Staff ID**: System will create new record
- **Deleted Records**: Use individual delete function in staff list

### 📈 Success Metrics

After successful upload, you should see:
- ✅ Confirmation message with count of added/updated records
- 📊 Updated staff count in the dashboard
- 📝 All records visible in the staff list
- ⚠️ Any warnings addressed appropriately

---

*Last updated: [Current Date]*
*Version: 2.0*
*For technical support, contact your system administrator*