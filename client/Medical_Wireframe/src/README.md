# MalariaAI

A comprehensive React web application for AI-powered malaria parasite detection from blood smear images. This system assists laboratory scientists in detecting malaria parasites with features for single/batch upload, live camera capture, patient management, and detailed analytics.

## Features

### 🔐 Authentication & User Management
- Secure login with role-based access (Lab Technician, Supervisor, Administrator)
- User management with different permission levels
- Role-based access control for sensitive operations

### 📊 Dashboard
- Real-time KPIs: Today's scans, positive rate, average processing time
- Recent activity feed with clickable results
- Quick actions for upload, batch upload, and live camera
- System alerts and notifications

### 📤 Upload & Analysis
#### Single Upload
- Drag-and-drop or file picker interface
- Image preview with validation
- Patient metadata form (ID, name, age, sex, sample type, clinician)
- Real-time upload progress
- Analyze now or queue for later

#### Batch Upload
- Multiple file or folder upload support
- Bulk patient ID mapping
- Progress tracking for each file
- Validation and error handling

### 📷 Live Camera Capture
- Digital microscope camera integration
- Live preview with camera controls:
  - Auto-capture toggle
  - Grid overlay
  - Exposure and zoom sliders
  - White balance presets
- Captured frames gallery with timestamps
- Patient metadata input
- Batch analyze captured frames

### 🔬 Analysis Results
- Comprehensive results table with:
  - Filtering by result type (Positive/Negative) and status
  - Search by patient name, ID, or result ID
  - Sortable columns
  - Bulk selection and export
- Status indicators: Queued, Running, Completed, Failed
- Confidence scores with manual review flags for low confidence
- Quick actions: View details, Download report, Re-run analysis

### 📋 Result Details
#### Findings Tab
- Overall classification (Positive/Negative)
- Severity level (Mild/Moderate/Severe)
- Parasite density (parasites/μL)
- Confidence score with visual progress bar
- Model version and algorithm information
- Detected parasite species with counts and confidence

#### Image Review Tab
- High-resolution blood smear image viewer
- Zoom in/out controls (50%-200%)
- Toggle parasite detection overlays:
  - Bounding boxes with species labels
  - Heatmap visualization
- Full-screen mode
- Pan and zoom controls

#### Quality Checks Tab
- Automated image quality assessment:
  - Image focus score
  - Staining quality
  - Artifact detection
  - Cell distribution
- Overall quality verdict

#### Audit Trail Tab
- Complete timeline of analysis events
- Model version used
- Analyst information
- QC approval status
- Clinician notes with save functionality

### 👥 Patient Database
- Complete patient records management
- Summary statistics (total patients, active cases, critical cases)
- Advanced filtering:
  - Search by name or patient ID
  - Filter by result type and status
  - Date range selection
- Patient profile cards with:
  - Demographics and contact information
  - Test history timeline
  - Positive/negative test ratio
  - Current treatment status

### 🏥 Patient Profile
- Detailed patient information panel
- Test history timeline with visual indicators
- Treatment history with medication details
- Results comparison with trend analysis
- Clinician notes with versioning
- Export consolidated patient report

### 📈 Reports & Analytics
#### Report Configuration
- Report types: Summary, Detailed Analysis, Patient Cohort, Performance Metrics, Quality Assurance
- Date range selection (Today, Last 7/30 days, 3/6 months, Year, Custom)
- Export formats: PDF, CSV, Excel, JSON

#### Analytics Tabs
1. **Overview**
   - Testing volume over time with monthly breakdown
   - Positive rate trends
   - Severity distribution charts
   - Species distribution analysis

2. **Trends**
   - Positive rate trends with insights
   - Testing volume analysis
   - Severe cases monitoring
   - Regional patterns

3. **Distribution**
   - Geographic distribution by district
   - Age and demographic breakdowns
   - Temporal patterns

4. **Performance**
   - Model accuracy metrics
   - Average confidence scores
   - Confusion matrix (TP, TN, FP, FN)
   - Quality assurance statistics

### ⚙️ Settings
#### General
- Organization details (name, contact, address)
- Laboratory logo upload
- Notification preferences

#### Devices
- Connected device management
- Camera/microscope configuration
- Default resolution and format settings
- Device status monitoring

#### Data & Privacy
- Data retention policy configuration (1-10 years, indefinite)
- Automatic anonymization toggle
- Audit logging
- GDPR compliance mode
- Data export and backup

#### Model
- Current model version display
- Auto-update toggle
- Model changelog with version history
- Confidence threshold configuration
- Algorithm information

#### Users & Roles
- User management table
- Add/edit/remove users
- Role assignment (Administrator, Supervisor, Lab Technician)
- Permission levels per role

#### Integrations
- API key management with show/hide
- EMR/LIS webhook configuration
- Third-party service connections
- Test connection functionality

## Technical Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Notifications**: Sonner
- **State Management**: React Hooks
- **Form Handling**: React Hook Form

## Key Components

### Layout
- `MainLayout`: Responsive layout with collapsible sidebar, top navigation, global search, and notifications

### Pages
- `Login`: Authentication with role selection
- `Dashboard`: Overview with KPIs and quick actions
- `Upload`: Single and batch upload functionality
- `LiveCamera`: Digital microscope camera integration
- `Results`: Results table with filtering and search
- `ResultDetails`: Comprehensive result view with tabs
- `Patients`: Patient database with search and filters
- `PatientProfile`: Individual patient records with timeline
- `Reports`: Analytics and report generation
- `Settings`: System configuration

## Mock Data

The application uses comprehensive mock data to demonstrate full functionality:
- 9 mock patients with complete demographics
- 9 test results with various statuses and outcomes
- Realistic confidence scores and parasite density values
- Multiple Plasmodium species represented

## Accessibility

- WCAG AA compliant color contrast
- Keyboard navigation support
- Screen reader friendly labels
- Focus indicators on interactive elements
- Clear error messages and recovery actions

## Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Collapsible sidebar on mobile
- Responsive tables with horizontal scroll
- Touch-friendly controls on mobile devices

## Future Enhancements

### Backend Integration (Recommended: Supabase)
- Real-time data synchronization
- Secure image storage
- User authentication and authorization
- Patient data persistence
- Result history tracking
- Analytics data aggregation
- API endpoints for external integrations

### Advanced Features
- Real-time collaboration
- Multi-language support
- Advanced ML model integration
- Mobile app companion
- Telemedicine integration
- Advanced reporting with custom templates

## Getting Started

This application is designed for demonstration purposes. For production use:

1. Connect to a backend database (Supabase recommended)
2. Implement secure authentication
3. Add image storage service
4. Integrate actual AI model for malaria detection
5. Configure EMR/LIS integrations
6. Set up proper data backup and retention policies

## Notes

- This is a frontend prototype with mock data
- Not suitable for collecting real patient data without backend
- API keys and credentials are placeholders
- Camera functionality requires browser permissions
- For production deployment, implement proper data security and HIPAA/GDPR compliance

## License

This is a demonstration application. Consult with legal and medical compliance teams before deploying in a clinical setting.
