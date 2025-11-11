// Shared mock data for the MalariaAI application

export interface TestResult {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  result: 'Positive' | 'Negative' | null;
  severity: 'Mild' | 'Moderate' | 'Severe' | null;
  density: number | null;
  confidence: number | null;
  status: 'Completed' | 'Running' | 'Queued' | 'Failed';
  analyst: string;
  modelVersion: string;
  sampleType?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  address: string;
  bloodType: string;
  registrationDate: string;
  status: string;
  clinician: string;
  lastTest?: string;
  totalTests?: number;
  positiveTests?: number;
  lastResult?: string;
  lastSeverity?: string | null;
}

export const mockPatients: Patient[] = [
  {
    id: 'P-1023',
    name: 'John Doe',
    age: 34,
    sex: 'Male',
    dateOfBirth: '1990-05-15',
    phone: '+1 (555) 123-4567',
    email: 'john.doe@email.com',
    address: '123 Main St, City, State 12345',
    bloodType: 'O+',
    registrationDate: '2024-08-15',
    status: 'Under Treatment',
    clinician: 'Dr. Sarah Johnson',
    lastTest: '2025-11-01',
    totalTests: 3,
    positiveTests: 2,
    lastResult: 'Positive',
    lastSeverity: 'Mild',
  },
  {
    id: 'P-1024',
    name: 'Sarah Smith',
    age: 28,
    sex: 'Female',
    dateOfBirth: '1997-03-22',
    phone: '+1 (555) 234-5678',
    email: 'sarah.smith@email.com',
    address: '456 Oak Ave, City, State 12345',
    bloodType: 'A+',
    registrationDate: '2024-09-10',
    status: 'Healthy',
    clinician: 'Dr. Sarah Johnson',
    lastTest: '2025-11-01',
    totalTests: 1,
    positiveTests: 0,
    lastResult: 'Negative',
    lastSeverity: null,
  },
  {
    id: 'P-1025',
    name: 'Michael Johnson',
    age: 42,
    sex: 'Male',
    dateOfBirth: '1983-07-08',
    phone: '+1 (555) 345-6789',
    email: 'michael.j@email.com',
    address: '789 Pine Rd, City, State 12345',
    bloodType: 'B+',
    registrationDate: '2024-07-20',
    status: 'Critical',
    clinician: 'Dr. Sarah Johnson',
    lastTest: '2025-11-01',
    totalTests: 5,
    positiveTests: 3,
    lastResult: 'Positive',
    lastSeverity: 'Severe',
  },
  {
    id: 'P-1026',
    name: 'Emily Brown',
    age: 31,
    sex: 'Female',
    dateOfBirth: '1994-11-30',
    phone: '+1 (555) 456-7890',
    email: 'emily.brown@email.com',
    address: '321 Elm St, City, State 12345',
    bloodType: 'AB+',
    registrationDate: '2024-10-05',
    status: 'Healthy',
    clinician: 'Dr. Sarah Johnson',
    lastTest: '2025-11-01',
    totalTests: 2,
    positiveTests: 0,
    lastResult: 'Negative',
    lastSeverity: null,
  },
  {
    id: 'P-1027',
    name: 'David Wilson',
    age: 55,
    sex: 'Male',
    dateOfBirth: '1970-02-14',
    phone: '+1 (555) 567-8901',
    email: 'david.w@email.com',
    address: '654 Maple Dr, City, State 12345',
    bloodType: 'O-',
    registrationDate: '2024-06-12',
    status: 'Under Treatment',
    clinician: 'Dr. Sarah Johnson',
    lastTest: '2025-11-01',
    totalTests: 4,
    positiveTests: 2,
    lastResult: 'Positive',
    lastSeverity: 'Mild',
  },
  {
    id: 'P-1028',
    name: 'Lisa Anderson',
    age: 38,
    sex: 'Female',
    dateOfBirth: '1987-09-19',
    phone: '+1 (555) 678-9012',
    email: 'lisa.anderson@email.com',
    address: '987 Cedar Ln, City, State 12345',
    bloodType: 'A-',
    registrationDate: '2024-05-28',
    status: 'Under Treatment',
    clinician: 'Dr. Sarah Johnson',
    lastTest: '2025-11-01',
    totalTests: 6,
    positiveTests: 3,
    lastResult: 'Positive',
    lastSeverity: 'Moderate',
  },
  {
    id: 'P-1029',
    name: 'Robert Martinez',
    age: 47,
    sex: 'Male',
    dateOfBirth: '1978-12-03',
    phone: '+1 (555) 789-0123',
    email: 'robert.m@email.com',
    address: '147 Birch Blvd, City, State 12345',
    bloodType: 'B-',
    registrationDate: '2024-08-30',
    status: 'Healthy',
    clinician: 'Dr. Sarah Johnson',
    lastTest: '2025-11-01',
    totalTests: 2,
    positiveTests: 0,
    lastResult: 'Negative',
    lastSeverity: null,
  },
  {
    id: 'P-1030',
    name: 'Jennifer Lee',
    age: 29,
    sex: 'Female',
    dateOfBirth: '1996-04-25',
    phone: '+1 (555) 890-1234',
    email: 'jennifer.lee@email.com',
    address: '258 Willow Way, City, State 12345',
    bloodType: 'AB-',
    registrationDate: '2024-09-15',
    status: 'Under Treatment',
    clinician: 'Dr. Sarah Johnson',
    lastTest: '2025-10-31',
    totalTests: 1,
    positiveTests: 1,
    lastResult: 'Positive',
    lastSeverity: 'Mild',
  },
  {
    id: 'P-1031',
    name: 'James Taylor',
    age: 51,
    sex: 'Male',
    dateOfBirth: '1974-06-12',
    phone: '+1 (555) 901-2345',
    email: 'james.t@email.com',
    address: '369 Spruce St, City, State 12345',
    bloodType: 'O+',
    registrationDate: '2024-07-08',
    status: 'Under Treatment',
    clinician: 'Dr. Sarah Johnson',
    lastTest: '2025-11-01',
    totalTests: 3,
    positiveTests: 1,
    lastResult: 'Positive',
    lastSeverity: 'Moderate',
  },
];

export const mockResults: TestResult[] = [
  {
    id: 'R-2847',
    patientId: 'P-1023',
    patientName: 'John Doe',
    date: '2025-11-01T10:30:00',
    result: 'Positive',
    severity: 'Mild',
    density: 1250,
    confidence: 94,
    status: 'Completed',
    analyst: 'Lab Tech A',
    modelVersion: 'v2.4.0',
    sampleType: 'Thin Smear',
  },
  {
    id: 'R-2846',
    patientId: 'P-1024',
    patientName: 'Sarah Smith',
    date: '2025-11-01T10:18:00',
    result: 'Negative',
    severity: null,
    density: 0,
    confidence: 98,
    status: 'Completed',
    analyst: 'Lab Tech A',
    modelVersion: 'v2.4.0',
    sampleType: 'Thin Smear',
  },
  {
    id: 'R-2845',
    patientId: 'P-1025',
    patientName: 'Michael Johnson',
    date: '2025-11-01T10:12:00',
    result: 'Positive',
    severity: 'Severe',
    density: 8750,
    confidence: 67,
    status: 'Completed',
    analyst: 'Lab Tech B',
    modelVersion: 'v2.4.0',
    sampleType: 'Thick Smear',
  },
  {
    id: 'R-2844',
    patientId: 'P-1026',
    patientName: 'Emily Brown',
    date: '2025-11-01T10:05:00',
    result: 'Negative',
    severity: null,
    density: 0,
    confidence: 96,
    status: 'Completed',
    analyst: 'Lab Tech A',
    modelVersion: 'v2.4.0',
    sampleType: 'Thin Smear',
  },
  {
    id: 'R-2843',
    patientId: 'P-1027',
    patientName: 'David Wilson',
    date: '2025-11-01T09:55:00',
    result: 'Positive',
    severity: 'Mild',
    density: 2100,
    confidence: 89,
    status: 'Completed',
    analyst: 'Lab Tech B',
    modelVersion: 'v2.4.0',
    sampleType: 'Thin Smear',
  },
  {
    id: 'R-2842',
    patientId: 'P-1028',
    patientName: 'Lisa Anderson',
    date: '2025-11-01T09:42:00',
    result: 'Positive',
    severity: 'Moderate',
    density: 4500,
    confidence: 92,
    status: 'Completed',
    analyst: 'Lab Tech A',
    modelVersion: 'v2.3.8',
    sampleType: 'Thick Smear',
  },
  {
    id: 'R-2841',
    patientId: 'P-1029',
    patientName: 'Robert Martinez',
    date: '2025-11-01T09:30:00',
    result: 'Negative',
    severity: null,
    density: 0,
    confidence: 99,
    status: 'Completed',
    analyst: 'Lab Tech B',
    modelVersion: 'v2.3.8',
    sampleType: 'Thin Smear',
  },
  {
    id: 'Q-0124',
    patientId: 'P-1030',
    patientName: 'Jennifer Lee',
    date: '2025-11-01T09:15:00',
    result: null,
    severity: null,
    density: null,
    confidence: null,
    status: 'Running',
    analyst: 'Lab Tech A',
    modelVersion: 'v2.4.0',
  },
  {
    id: 'Q-0123',
    patientId: 'P-1031',
    patientName: 'James Taylor',
    date: '2025-11-01T09:10:00',
    result: null,
    severity: null,
    density: null,
    confidence: null,
    status: 'Queued',
    analyst: 'Lab Tech A',
    modelVersion: 'v2.4.0',
  },
];

export const getPatientById = (id: string): Patient | undefined => {
  return mockPatients.find(p => p.id === id);
};

export const getResultById = (id: string): TestResult | undefined => {
  return mockResults.find(r => r.id === id);
};

export const getResultsByPatientId = (patientId: string): TestResult[] => {
  return mockResults.filter(r => r.patientId === patientId);
};
