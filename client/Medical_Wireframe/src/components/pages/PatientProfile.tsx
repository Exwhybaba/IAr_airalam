import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Calendar, User, Phone, Mail, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import FindingsCard from '../widgets/FindingsCard';

/* const mockPatientData = {
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
}; */

/* const tests = [
  {
    id: 'R-2847',
    date: '2025-11-01T10:30:00',
    result: 'Positive',
    severity: 'Mild',
    density: 1250,
    confidence: 94,
    sampleType: 'Thin Smear',
    analyst: 'Lab Tech A',
  },
  {
    id: 'R-2512',
    date: '2025-10-28T14:20:00',
    result: 'Positive',
    severity: 'Moderate',
    density: 3400,
    confidence: 91,
    sampleType: 'Thick Smear',
    analyst: 'Lab Tech B',
  },
  {
    id: 'R-2189',
    date: '2025-10-15T09:15:00',
    result: 'Negative',
    severity: null,
    density: 0,
    confidence: 98,
    sampleType: 'Thin Smear',
    analyst: 'Lab Tech A',
  },
]; */

/* const mockTreatmentHistory = [
  {
    date: '2025-10-28',
    treatment: 'Artemisinin-based combination therapy (ACT)',
    dosage: '4 tablets daily for 3 days',
    prescribedBy: 'Dr. Sarah Johnson',
    status: 'Ongoing',
  },
  {
    date: '2025-09-15',
    treatment: 'Chloroquine',
    dosage: '600mg initial, 300mg after 6-8 hours',
    prescribedBy: 'Dr. Sarah Johnson',
    status: 'Completed',
  },
]; */
import { getPatient } from '../../lib/api';

export default function PatientProfile() {
  const { id } = useParams();
  const [clinicianNotes, setClinicianNotes] = useState('');
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPatient(id)
      .then((p) => setPatient(p))
      .catch(() => setPatient(null))
      .finally(() => setLoading(false));
  }, [id]);

  const tests = patient?.tests || [];
  const positiveTests = tests.filter((t: any) => t.result === 'Positive').length;
  const totalTests = tests.length;
  const aggregate = patient?.aggregate;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/patients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-gray-900">Patient Profile</h1>
            <p className="text-gray-600">{patient?.id || id} - {patient?.name || '-'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Medical History
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Information Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <div className="text-gray-900">{patient?.name || '-'}</div>
                  <div className="text-sm text-gray-600">{patient?.id || id}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Age / Sex</span>
                  <span className="text-gray-900">{patient?.age ?? '-'} / {patient?.sex || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Test</span>
                  <span className="text-gray-900">{patient?.lastTest ? new Date(patient.lastTest).toLocaleDateString() : '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Clinician</span>
                  <span className="text-gray-900">{patient?.clinician || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {patient?.status || '-'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-600">Phone</div>
                    <div className="text-gray-900">-</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-600">Email</div>
                    <div className="text-gray-900">-</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-gray-600">Address</div>
                    <div className="text-gray-900">-</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Primary Clinician</span>
                </div>
                <div className="text-gray-900">{patient?.clinician || '-'}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Tests</span>
                  <span className="text-gray-900">{totalTests}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Positive Results</span>
                  <span className="text-red-600">{positiveTests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Positive Rate</span>
                  <span className="text-gray-900">
                    {Math.round((positiveTests / totalTests) * 100)}%
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                  <div className="text-sm text-gray-600 mb-2">Last Test</div>
                  <div className="text-gray-900">{patient?.lastTest ? new Date(patient.lastTest).toLocaleDateString() : '-'}</div>
                  {tests[0] && (
                    <Badge className="mt-2 bg-red-100 text-red-700 hover:bg-red-100">{tests[0].result}</Badge>
                  )}
              </div>
              <Separator />
              <div>
                <div className="text-sm text-gray-600 mb-2">Aggregated Metrics</div>
                <FindingsCard summary={aggregate} severity={aggregate?.severity} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList>
              <TabsTrigger value="timeline">Test Timeline</TabsTrigger>
              <TabsTrigger value="treatment">Treatment History</TabsTrigger>
              <TabsTrigger value="comparison">Compare Results</TabsTrigger>
              <TabsTrigger value="notes">Clinician Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Test History Timeline</CardTitle>
                  <CardDescription>Complete history of malaria tests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {tests.map((test: any, index: number) => (
                      <div key={test.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              test.result === 'Positive' ? 'bg-red-600' : 'bg-green-600'
                            }`}
                          />
                           {index < tests.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 flex-1 mt-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Link
                                to={`/results/${test.id}`}
                                className="text-red-600 hover:text-red-700"
                              >
                                {test.id}
                              </Link>
                              <p className="text-sm text-gray-600 mt-1">
                                {new Date(test.date).toLocaleString()}
                              </p>
                            </div>
                            <Badge
                              className={
                                test.result === 'Positive'
                                  ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                  : 'bg-green-100 text-green-700 hover:bg-green-100'
                              }
                            >
                              {test.result}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                            <div>
                              <span className="text-gray-600">Sample Type:</span>{' '}
                              <span className="text-gray-900">{test.sampleType}</span>
                            </div>
                            {test.severity && (
                              <div>
                                <span className="text-gray-600">Severity:</span>{' '}
                                <span className="text-gray-900">{test.severity}</span>
                              </div>
                            )}
                            {test.density > 0 && (
                              <div>
                                <span className="text-gray-600">Density:</span>{' '}
                                <span className="text-gray-900">
                                  {test.density.toLocaleString()} /μL
                                </span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-600">Confidence:</span>{' '}
                              <span className="text-gray-900">{test.confidence}%</span>
                            </div>
                            {(test.parasite_count != null || test.wbc_counted != null) && (
                              <div className="col-span-2">
                                <span className="text-gray-600">Counts:</span>{' '}
                                <span className="text-gray-900">{test.parasite_count ?? '-'} / {test.wbc_counted ?? '-'}{test.wbcs_per_ul ? ` (WBCs/µL: ${test.wbcs_per_ul})` : ''}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-gray-600">Analyst:</span>{' '}
                              <span className="text-gray-900">{test.analyst}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="treatment" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Treatment History</CardTitle>
                  <CardDescription>Prescribed medications and therapies</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockTreatmentHistory.map((treatment, index) => (
                      <div
                        key={index}
                        className="p-4 border border-gray-200 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-900">{treatment.treatment}</span>
                          <Badge
                            variant="outline"
                            className={
                              treatment.status === 'Ongoing'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }
                          >
                            {treatment.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Dosage:</strong> {treatment.dosage}
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Prescribed by {treatment.prescribedBy}</span>
                          <span>{new Date(treatment.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Results Comparison</CardTitle>
                  <CardDescription>Compare parasite density over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Simple comparison chart */}
                    <div className="space-y-4">
                      {tests
                        .filter(t => t.result === 'Positive')
                        .map((test, index) => (
                          <div key={test.id}>
                            <div className="flex items-center justify-between mb-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">
                                  {new Date(test.date).toLocaleDateString()}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {test.severity}
                                </Badge>
                              </div>
                              <span className="text-gray-900">
                                {test.density.toLocaleString()} /μL
                              </span>
                            </div>
                            <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`absolute inset-y-0 left-0 rounded-full ${
                                  test.severity === 'Severe'
                                    ? 'bg-red-600'
                                    : test.severity === 'Moderate'
                                    ? 'bg-amber-500'
                                    : 'bg-yellow-500'
                                }`}
                                style={{ width: `${(test.density / 10000) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>Trend Analysis:</strong> Parasite density decreased by 63%
                        since previous positive test. Treatment appears effective. Continue
                        monitoring.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Clinician Notes</CardTitle>
                  <CardDescription>Add notes about patient treatment and observations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Enter clinician notes..."
                      value={clinicianNotes}
                      onChange={(e) => setClinicianNotes(e.target.value)}
                      rows={10}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Last updated: {new Date().toLocaleDateString()}
                    </p>
                    <Button>Save Notes</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Previous Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-900">Dr. Sarah Johnson</span>
                      <span className="text-sm text-gray-600">Oct 28, 2025</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Patient showing improvement with ACT treatment. Parasite density
                      decreasing. Continue current treatment plan and schedule follow-up in
                      3 days.
                    </p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-900">Dr. Sarah Johnson</span>
                      <span className="text-sm text-gray-600">Oct 15, 2025</span>
                    </div>
                    <p className="text-sm text-gray-700">
                      Test negative. Patient completed chloroquine treatment successfully.
                      No residual symptoms reported. Advised to return if symptoms recur.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

