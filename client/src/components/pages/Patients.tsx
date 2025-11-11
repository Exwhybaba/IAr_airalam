import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, Calendar, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { Calendar as CalendarComponent } from '../ui/calendar';
import { listPatients } from '../../lib/api';

type PatientRow = {
  id: string
  name: string
  age?: number
  sex?: string
  lastTest?: string
  totalTests?: number
  positiveTests?: number
  lastResult?: string
  lastSeverity?: string | null
  status?: string
}

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listPatients()
      .then((r) => setPatients(r.items || []))
      .catch(() => setPatients([]))
      .finally(() => setLoading(false))
  }, [])

  const filteredPatients = patients.filter(patient => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesResult =
      filterResult === 'all' ||
      patient.lastResult?.toLowerCase() === filterResult.toLowerCase();

    const matchesStatus =
      filterStatus === 'all' ||
      patient.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesResult && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredPatients.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredPatients.map(p => p.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Patients Database</h1>
          <p className="text-gray-600">View and manage patient records and test history</p>
        </div>
        {selectedRows.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedRows.length} selected</span>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Selected
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="text-sm text-gray-600">Total Patients</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-gray-900">{patients.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="text-sm text-gray-600">Active Cases</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-gray-900">
              {patients.filter(p => (p.status === 'Under Treatment' || p.status === 'Critical')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="text-sm text-gray-600">Critical Cases</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-red-600">
              {patients.filter(p => p.status === 'Critical').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <div className="text-sm text-gray-600">Tests Today</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl text-gray-900">
              {patients.filter(p => p.lastTest && new Date(p.lastTest).toDateString() === new Date().toDateString()).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by patient name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="under treatment">Under Treatment</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Calendar className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.length === filteredPatients.length && filteredPatients.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age / Sex</TableHead>
                  <TableHead>Last Test</TableHead>
                  <TableHead>Total Tests</TableHead>
                  <TableHead>Last Result</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Loading patients...
                    </TableCell>
                  </TableRow>
                ) : filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No patients found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id} className={selectedRows.includes(patient.id) ? 'bg-gray-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.includes(patient.id)}
                          onCheckedChange={() => toggleSelectRow(patient.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Link to={`/patients/${patient.id}`} className="text-red-600 hover:text-red-700">
                          {patient.id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-900">{patient.name}</TableCell>
                      <TableCell className="text-gray-600">
                        {patient.age} / {patient.sex}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {patient.lastTest ? new Date(patient.lastTest).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        <div className="flex flex-col">
                          <span>{patient.totalTests} total</span>
                          {patient.positiveTests > 0 && (
                            <span className="text-xs text-red-600">
                              {patient.positiveTests} positive
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            className={
                              patient.lastResult === 'Positive'
                                ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                : 'bg-green-100 text-green-700 hover:bg-green-100'
                            }
                          >
                            {patient.lastResult}
                          </Badge>
                          {patient.lastSeverity && (
                            <span className="text-xs text-gray-600">{patient.lastSeverity}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            patient.status === 'Critical'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : patient.status === 'Under Treatment'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-green-50 text-green-700 border-green-200'
                          }
                        >
                          {patient.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/patients/${patient.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Showing {filteredPatients.length} of {patients.length} patients
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
