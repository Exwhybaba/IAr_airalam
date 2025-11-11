import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, Calendar, TrendingUp, TrendingDown, Users, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Badge } from '../ui/badge'
import { Separator } from '../ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Calendar as CalendarComponent } from '../ui/calendar'
import { toast } from 'sonner@2.0.3'
import { listResults } from '../../lib/api'

export default function Reports(){
  const [reportType, setReportType] = useState('summary')
  const [dateRange, setDateRange] = useState('last30days')
  const [exportFormat, setExportFormat] = useState('pdf')
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    listResults(500)
      .then(r => setRows(r.items || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  const stats = useMemo(() => {
    const totalTests = rows.length
    const positives = rows.filter(r => r.result === 'Positive').length
    const positiveRate = totalTests ? +(100 * positives / totalTests).toFixed(1) : 0
    const criticalCases = rows.filter(r => r.severity === 'Severe').length
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const map = new Map<string, { tests:number, positive:number }>()
    for (const r of rows){
      const dt = r.created_at ? new Date(r.created_at) : null
      if (!dt) continue
      const k = months[dt.getMonth()]
      const v = map.get(k) || { tests: 0, positive: 0 }
      v.tests += 1; if (r.result === 'Positive') v.positive += 1
      map.set(k, v)
    }
    const testsByMonth = months.map(m => ({ month: m, tests: map.get(m)?.tests || 0, positive: map.get(m)?.positive || 0 }))
    const sevCounts = rows.reduce((acc: Record<string,number>, r)=>{ acc[r.severity || 'None']=(acc[r.severity || 'None']||0)+1; return acc }, {} as Record<string,number>)
    const totalSev = Object.values(sevCounts).reduce((a,b)=>a+b,0) || 1
    const severityDistribution = Object.entries(sevCounts).map(([severity,count])=>({ severity, count, percentage: Math.round(100*(count as number)/totalSev) }))
    return { totalTests, positiveRate, averageProcessingTime: 0, criticalCases, testsByMonth, severityDistribution }
  }, [rows])

  const handleExport = () => {
    toast.success(`Exporting report as ${exportFormat.toUpperCase()}...`)
  }

  const maxTests = Math.max(1, ...(stats.testsByMonth.map((m:any) => m.tests)))

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and export comprehensive analysis reports</p>
        </div>
        <Button onClick={handleExport} className="bg-red-600 hover:bg-red-700">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Tabs defaultValue={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-gray-600">Total Tests</CardTitle>
                <FileText className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-gray-900">{stats.totalTests.toLocaleString()}</div>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="text-green-600">Live</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-gray-600">Positive Rate</CardTitle>
                <Activity className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-gray-900">{stats.positiveRate}%</div>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-red-600" />
                  <span className="text-red-600">Auto-computed</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-gray-600">Avg. Processing</CardTitle>
                <Activity className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-gray-900">{stats.averageProcessingTime}s</div>
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-green-600" />
                  <span className="text-green-600">-</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-gray-600">Critical Cases</CardTitle>
                <Users className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-red-600">{stats.criticalCases}</div>
                <p className="text-xs text-gray-600 mt-1">Severity based on density</p>
              </CardContent>
            </Card>
          </div>

          {/* Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Testing Activity</CardTitle>
              <CardDescription>Monthly tests and positives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.testsByMonth.map((month: any) => (
                  <div key={month.month} className="flex items-center gap-4">
                    <div className="w-12 text-sm text-gray-600">{month.month}</div>
                    <div className="flex-1">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-600 rounded-full" style={{ width: `${maxTests ? (month.tests / maxTests) * 100 : 0}%` }} />
                      </div>
                    </div>
                    <div className="w-36 text-sm text-gray-600 text-right">
                      Tests: {month.tests} • Positive: {month.positive}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Severity distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Severity Distribution</CardTitle>
              <CardDescription>Across all completed results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.severityDistribution.map((item: any) => (
                  <div key={item.severity} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-900">{item.severity}</span>
                      <Badge variant="outline">{item.percentage}%</Badge>
                    </div>
                    <div className="text-sm text-gray-600">{item.count} cases</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Cases by region and district</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">Geographic distribution unavailable (no location fields).</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Metrics</CardTitle>
              <CardDescription>AI model confidence (derived from detections)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Average Confidence (UI)</Label>
                  <span className="text-gray-900">{rows.length ? Math.round(rows.reduce((a,r)=>a+(r.confidence||0),0)/rows.length) : 0}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${rows.length ? Math.round(rows.reduce((a,r)=>a+(r.confidence||0),0)/rows.length) : 0}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

