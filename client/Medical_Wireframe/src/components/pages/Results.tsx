import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, RefreshCw, Eye, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { listResults } from '../../lib/api';
import { exportResultsCSV } from '../../lib/export';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';

export default function Results() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterResult, setFilterResult] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listResults(200)
      .then((r) => setRows(r.items || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  const source = rows;
  const filteredResults = source.filter((result) => {
    const matchesSearch =
      (result.patientName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (result.patientId?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (result.id?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    const matchesResult =
      filterResult === 'all' ||
      (result.result?.toLowerCase() || '') === filterResult.toLowerCase();

    const matchesStatus =
      filterStatus === 'all' ||
      (result.status?.toLowerCase() || '') === filterStatus.toLowerCase();

    return matchesSearch && matchesResult && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedRows.length === filteredResults.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredResults.map((r: any) => r.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRows((prev) => (prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Analysis Results</h1>
          <p className="text-gray-600">View and manage analysis queue and results</p>
        </div>
        {selectedRows.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{selectedRows.length} selected</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selected = filteredResults.filter((r: any) => selectedRows.includes(r.id));
                exportResultsCSV(selected);
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Selected
            </Button>
          </div>
        )}
      </div>

      <TooltipProvider delayDuration={100}>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by patient name, ID, or result ID..."
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
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
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
                      checked={selectedRows.length === filteredResults.length && filteredResults.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Result ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Parasites</TableHead>
                  <TableHead>Counts</TableHead>
                  <TableHead>Density</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      Loading results...
                    </TableCell>
                  </TableRow>
                ) : filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No results found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((result: any) => (
                    <TableRow key={result.id} className={selectedRows.includes(result.id) ? 'bg-gray-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.includes(result.id)}
                          onCheckedChange={() => toggleSelectRow(result.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {(result.parasite_count != null || result.wbc_counted != null) ? (
                          <div className="flex items-center gap-2 text-gray-700">
                            <span>{result.parasite_count ?? '-'} / {result.wbc_counted ?? '-'}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button type="button" className="text-gray-500 hover:text-gray-700" aria-label="Counts info">
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Trophozoites / WBCs counted. Assumed WBCs/µL: {result.wbcs_per_ul ?? 'default'}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link to={`/results/${result.id}`} className="text-red-600 hover:text-red-700">
                          {result.id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-gray-900">{result.patientName || '-'}</div>
                          <div className="text-sm text-gray-500">{result.patientId || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {result.created_at ? formatDate(result.created_at) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            result.status === 'Completed'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : result.status === 'Running'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : result.status === 'Queued'
                              ? 'bg-gray-50 text-gray-700 border-gray-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }
                        >
                          {result.status || 'Completed'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {result.result ? (
                          <Badge
                            className={
                              result.result === 'Positive'
                                ? 'bg-red-100 text-red-700 hover:bg-red-100'
                                : 'bg-green-100 text-green-700 hover:bg-green-100'
                            }
                          >
                            {result.result}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.severity ? (
                          <span className="text-gray-700">{result.severity}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.total != null ? (
                          <span className="text-gray-700">{result.total}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.density != null ? (
                          <span className="text-gray-700">{result.density} /μL</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.confidence != null ? (
                          <div className="flex items-center gap-2">
                            <span className={result.confidence < 70 ? 'text-amber-600' : 'text-gray-700'}>
                              {result.confidence}%
                            </span>
                            {result.confidence < 70 && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                Review
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to={`/results/${result.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a href={`/results/${result.id}?export=pdf`} target="_blank" rel="noreferrer">
                                <Download className="w-4 h-4 mr-2" />
                                Download Report
                              </a>
                            </DropdownMenuItem>
                            {result.status === 'Completed' && (
                              <DropdownMenuItem>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Re-run Analysis
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Showing {filteredResults.length} of {source.length} results
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
      </TooltipProvider>
    </div>
  );
}
