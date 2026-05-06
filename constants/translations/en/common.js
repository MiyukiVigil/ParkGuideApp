// Common UI strings, alerts, and error messages

export default {
    // Alert titles
    missingFields: "Missing Fields",
    loginFailed: "Login Failed",
    sessionExpired: "Session Expired",
    unavailable: "Unavailable",
    authRequired: "Authentication Required",
    downloadFailed: "Download Failed",
    error: "Error",
    logout: "Secure Logout",
    logoutConfirm: "Are you sure you want to sign out? All local data will be cleared.",
    
    // Common messages
    pleaseEnterEmailPassword: "Please enter your email and password.",
    somethingWentWrong: "Something went wrong. Try again.",
    pleaseLogInAgain: "Please log in again.",
    thisFileNotAvailable: "This file is not currently available.",
    couldNotDownloadPDF: "Could not download PDF. Please try again.",
    failedToOpenFile: "Failed to open file. Please try again.",
    failedToSignOut: "Failed to sign out.",
    sessionHasExpired: "Your session has expired. Please log in again.",
    
    // Button labels
    signOut: "Sign Out",
    cancel: "Cancel",
    signingIn: "Signing in...",
    
    // Loading states
    loadingNotifications: "Loading notifications...",
    
    // Empty states
    allCaughtUp: "All caught up",
    noNotificationsView: "There are no notifications in this view right now.",
    noQuizFound: "No Quiz Found",
    
    // Settings labels
    demoLoginEnabled: "Demo login enabled for frontend preview",
    protectedSession: "Protected session • Verified access",
    appVersion: "v1.0.0 - Sarawak Forestry Corporation",
    
    // Notification section
    notificationCentre: "Notification Centre",
    reviewAlerts: "Review operational alerts and recent updates for forest guide duties.",
    markAllRead: "Mark all read",
    clearRead: "Clear read",
    
    // Filter options
    all: "All",
    unread: "Unread",
    alerts: "Alerts",
    
    // Notification type
    alert: "Alert",
    update: "Update",
    
    // Guide preferences
    guidePreferences: "Guide Preferences",
    tapToOpenSettings: "Tap here to open account settings, email, password and profile",
    
    // Appearance section
    appearance: "Appearance",
    themeMode: "Theme Mode",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    interfaceMode: "Interface Mode",
    basic: "Basic",
    pro: "Pro",
    highContrast: "High Contrast",
    highContrastOn: "High contrast on",
    highContrastOff: "High contrast off",
    backgroundAnimations: "Background Animations",
    animationsEnabled: "Animations enabled",
    animationsDisabled: "Animations disabled",
    
    // Font size options
    small: "Small",
    standard: "Standard",
    large: "Large",
    fontStyle: "Font Style",
    systemFont: "System",
    serifFont: "Serif",
    monoFont: "Monospace",
    
    // Training section
    trainingOverview: "Training Overview",
    learnFlexibly: "Learn flexibly, track progress, and unlock new guide skills.",
    completedModules: "Completed modules",
    overallProgress: "Overall progress",
    modules: "modules",
    interactiveLessons: "Interactive lessons, assessments, and completion tracking.",
    courseSummary: "Course Summary",
    completeModulesInOrder: "Complete modules in order to unlock the next lesson and keep your guide training up to date.",
    tapToStartMedia: "Tap to start module media",
    
    // Home section
    continueYourPath: "Continue your current eco-guide learning path and keep your certification progress on track.",
    modulesRemaining: "modules remaining",
    completed: "Completed",
    remaining: "Remaining",
    
    // Validation errors (Password)
    fillAllPasswordFields: "Please fill in all password fields.",
    passwordMustBe8: "New password must be at least 8 characters.",
    passwordsDoNotMatch: "New password and confirm password do not match.",
    currentPasswordIncorrect: "Your current password is incorrect.",
    
    // Language names
    english: "English",
    malay: "Bahasa Melayu",
    chinese: "中文",
    
    // Settings
    preferencesAndDisplay: "Preferences and display",
    
    // Accessibility section
    accessibility: "Accessibility",
    textToSpeech: "Text-to-Speech (TTS)",
    readTrainingModulesAloud: "Read the current screen aloud",
    
    // Account settings
    accountSettings: "Account Settings",
    profileAndSecurity: "Profile and security",
    failedToLoadAccountInfo: "Failed to load account information.",
    invalidName: "Invalid Name",
    pleaseEnterValidName: "Please enter a valid name.",
    invalidEmail: "Invalid Email",
    pleaseEnterValidEmailAddress: "Please enter a valid email address.",
    invalidPhone: "Invalid Phone",
    pleaseEnterValidPhoneNumber: "Please enter a valid phone number.",
    saved: "Saved",
    accountDetailsUpdated: "Your account details have been updated.",
    failedToSaveProfileChanges: "Failed to save profile changes.",
    failedToSignOut: "Failed to sign out.",
    passwordChanged: "Password Changed",
    yourPasswordHasBeenChanged: "Your password has been changed.",
    email: "Email",
    phone: "Phone",
    changePassword: "Change Password",
    updateYourLoginPassword: "Update your login password",
    
    // Training
    failedToSaveProgress: "Failed to save progress.",
    forestLearningHub: "Forest learning hub",
    courseModules: "Course modules",
    
    // Dashboard
    adminDashboard: "Admin Dashboard",
    parkGuideWebApp: "ParkGuide web app",
    
    // Other sections
    tourMonitor: "Tour Monitor",
    liveFieldMonitor: "Live field monitor",
    forestKnowledgeResources: "Forest knowledge resources",
    forestResources: "Forest resources",
    verifiedRecords: "Verified records",
    preferences: "Preferences",
    liveForestMonitor: "Live forest monitor",
    monitorOffline: "Camera offline",
    checkingLabel: "CHECKING",
    offlineLabel: "OFFLINE",
    errorLabel: "ERROR",
    cameraModuleLive: "Camera module is live.",
    cameraModuleOffline: "Camera module is offline.",
    localPreviewRunning: "Local camera preview is running.",
    monitoringNotStarted: "Monitoring session has not started.",
    liveCameraPreview: "Live Camera Preview",
    esp32StreamPreview: "ESP32-CAM stream preview",
    phoneCameraPlaceholder: "Phone camera placeholder until ESP32-CAM stream is connected",
    cameraPreviewDisabled: "Camera preview is not active",
    cameraPermissionHelp: "Grant camera permission to use the phone camera as a temporary monitoring preview.",
    enableCameraPreview: "Enable Camera Preview",
    cameraSourceEsp32: "ESP32-CAM",
    cameraSourcePhone: "Phone Camera Placeholder",
    startMonitoring: "Start Monitoring",
    stopMonitoring: "Stop Monitoring",
    switchCamera: "Switch",
    cameraModule: "Camera Module",
    aiDetection: "AI Detection",
    standbyLabel: "Standby",
    notRunningLabel: "Not running",
    detectionOverview: "Detection Overview",
    detectionOverviewBody: "This section is prepared for the future AI abnormal activity detection flow. When connected, detected violations can appear here with timestamp, confidence score, guide/session ID, and evidence status.",
    sessionStatus: "Session Status",
    activeLabel: "Active",
    inactiveLabel: "Inactive",
    evidenceStorage: "Evidence Storage",
    notRecordingLabel: "Not recording",
    lastCameraHeartbeat: "Last Camera Heartbeat",
    notAvailableShort: "N/A",
    recentDetections: "Recent Detections",
    recentDetectionsSub: "Latest abnormal activity alerts will appear here",
    noAbnormalActivity: "No abnormal activity detected",
    noAbnormalActivityBody: "Once the AI model is integrated, detected prohibited actions such as damaging protected plants or disturbing wildlife can be listed here.",
    
    // Badges/Certificates section
    noCompletedModulesYet: "No completed modules yet",
    finishTrainingModulesUnlockBadges: "Finish training modules to unlock badges.",
    allActiveBadgesEarned: "All active badges earned",
    greatWorkUnlockedEveryActiveBadge: "Great work — you have unlocked every active badge.",
    noBadgesEarnedYet: "No badges earned yet",
    completeMoreModulesEarnBadges: "Complete more modules to earn badges.",
    
    // Missing error
    missingDownloadURL: "Missing download URL",

    // Login page
    signInWithPasskey: "Sign in with passkey",
    checkingPasskey: "Checking passkey...",
    applyForAccount: "Apply for account",

    // Profile photo
    unsupportedFile: "Unsupported File",
    pleaseChooseImageFile: "Please choose an image file for your profile photo.",
    imageTooLarge: "Image Too Large",
    pleaseChooseSmallerImage: "Please choose an image smaller than 5 MB.",
    uploadingPhoto: "Uploading...",
    choosePhoto: "Choose Photo",
    profilePhotoUpdated: "Profile Photo Updated",
    profilePhotoSaved: "Your new profile photo has been saved to your account.",
    uploadFailed: "Upload Failed",
    couldNotUploadPhoto: "We could not upload your profile photo right now.",

    // Generic actions
    success: "Success",
    ok: "OK",
    save: "Save",
    update: "Update",
    fullName: "Full Name",
    editProfile: "Edit Profile",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",

    // Enrollment
    cannotEnroll: "Cannot Enroll",
    cannotEnrollYet: "Cannot Enroll Yet",
    enrollmentSuccessMessage: "You have successfully enrolled in this course.",
    unknownEnrollmentError: "An unknown error occurred during enrollment.",
    noChaptersMessage: "This course has no chapters yet.",
    completePrerequisitesFirst: "Please complete all prerequisite courses first.",
    prerequisiteCompleted: "(Completed)",
    prerequisiteRequired: "(Required)",
}

