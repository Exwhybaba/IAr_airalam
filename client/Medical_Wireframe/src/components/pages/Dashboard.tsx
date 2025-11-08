import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Camera, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { listResults } from '../../lib/api';

type KPI = { title: string; value: string; subtitle?: string; trend?: 'up'|'down'|'neutral'; icon: any }

export default function Dashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listResults(200)
      .then((r) => setItems(r.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const todays = items.filter((it) => (it.created_at ? new Date(it.created_at).toDateString() === today : false));
  const total = items.length;
  const positives = items.filter((it) => it.result === 'Positive').length;
  const positiveRate = total ? Math.round((positives / total) * 100) : 0;
  const lowConf = items.filter((it) => typeof it.confidence === 'number' && it.confidence < 70).length;

  const kpis: KPI[] = [
    { title: "Today's Scans", value: String(todays.length), trend: 'up', icon: FileText },
    { title: 'Positive Rate', value: `${positiveRate}%`, subtitle: `${positives} of ${total}`, trend: 'up', icon: TrendingUp },
    { title: 'Pending Review', value: String(lowConf), subtitle: 'Low confidence', trend: 'neutral', icon: AlertCircle },
    { title: 'Total Results', value: String(total), trend: 'neutral', icon: FileText },
  ];

  const recentActivity = items.slice(0, 6);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your lab overview.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-gray-600">
                  {kpi.title}
                </CardTitle>
                <Icon className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-gray-900">{kpi.value}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {kpi.subtitle && <span>{kpi.subtitle}</span>}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/upload">
            <Button variant="outline" className="w-full h-auto flex flex-col items-center gap-3 p-6 hover:bg-red-50 hover:border-red-200">
              <Upload className="w-8 h-8 text-red-600" />
              <div className="text-center">
                <div className="text-gray-900">Upload Single</div>
                <div className="text-xs text-gray-600 mt-1">Upload one image</div>
              </div>
            </Button>
          </Link>

          <Link to="/upload?tab=batch">
            <Button variant="outline" className="w-full h-auto flex flex-col items-center gap-3 p-6 hover:bg-red-50 hover:border-red-200">
              <FileText className="w-8 h-8 text-red-600" />
              <div className="text-center">
                <div className="text-gray-900">Upload Batch</div>
                <div className="text-xs text-gray-600 mt-1">Multiple files or folder</div>
              </div>
            </Button>
          </Link>

          <Link to="/camera">
            <Button variant="outline" className="w-full h-auto flex flex-col items-center gap-3 p-6 hover:bg-red-50 hover:border-red-200">
              <Camera className="w-8 h-8 text-red-600" />
              <div className="text-center">
                <div className="text-gray-900">Open Live Camera</div>
                <div className="text-xs text-gray-600 mt-1">Digital microscope</div>
              </div>
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest analysis results</CardDescription>
            </div>
            <Link to="/results">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading && <div className="text-sm text-gray-500">Loading...</div>}
            {!loading && recentActivity.map((activity) => (
              <Link
                key={activity.id}
                to={`/results/${activity.id}`}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-900">{activity.patientName || '-'}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{activity.patientId || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{activity.id}</span>
                    <span>•</span>
                    <span>{activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {activity.severity && (
                    <Badge variant="outline" className="text-xs">
                      {activity.severity}
                    </Badge>
                  )}
                  <Badge
                    className={
                      activity.result === 'Positive'
                        ? 'bg-red-100 text-red-700 hover:bg-red-100'
                        : 'bg-green-100 text-green-700 hover:bg-green-100'
                    }
                  >
                    {activity.result}
                  </Badge>
                  <div className="text-sm text-gray-600 min-w-[60px] text-right">
                    {activity.confidence != null ? `${activity.confidence}% conf.` : '-'}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

