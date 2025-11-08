import { useEffect, useState } from 'react';
import { Save, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner@2.0.3';
import { getSettings as apiGetSettings, updateSettings as apiUpdateSettings } from '../../lib/api';

export default function Settings() {
  // Organization Profile
  const [orgName, setOrgName] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgPhone, setOrgPhone] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  // Analysis Preferences
  const [conf, setConf] = useState<string>('0.25');
  const [wbcsPerUlDefault, setWbcsPerUlDefault] = useState<string>('8000');
  // Notifications
  const [notifyEmails, setNotifyEmails] = useState<boolean>(true);
  const [lowConfAlerts, setLowConfAlerts] = useState<boolean>(false);
  const [loadingSettings, setLoadingSettings] = useState(false);

  useEffect(()=>{
    setLoadingSettings(true)
    apiGetSettings().then(({ settings })=>{
      setOrgName(String(settings?.ORG_NAME ?? ''))
      setOrgEmail(String(settings?.ORG_EMAIL ?? ''))
      setOrgPhone(String(settings?.ORG_PHONE ?? ''))
      setOrgAddress(String(settings?.ORG_ADDRESS ?? ''))
      setLogoUrl(String(settings?.LOGO_URL ?? ''))
      setWbcsPerUlDefault(String(settings?.WBCS_PER_UL_DEFAULT ?? '8000'))
      setConf(settings?.CONF != null ? String(settings.CONF) : '0.25')
      setNotifyEmails(Boolean(settings?.NOTIFY_EMAILS_ENABLED))
      setLowConfAlerts(Boolean(settings?.LOW_CONF_ALERTS_ENABLED))
    }).catch(()=>{
      // noop
    }).finally(()=>setLoadingSettings(false))
  },[])

  const handleSave = async () => {
    try{
      const payload: any = {
        ORG_NAME: orgName,
        ORG_EMAIL: orgEmail,
        ORG_PHONE: orgPhone,
        ORG_ADDRESS: orgAddress,
        WBCS_PER_UL_DEFAULT: Number(wbcsPerUlDefault),
        CONF: Number(conf),
        NOTIFY_EMAILS_ENABLED: notifyEmails,
        LOW_CONF_ALERTS_ENABLED: lowConfAlerts,
      }
      await apiUpdateSettings(payload)
      toast.success('Settings saved successfully')
    }catch(e:any){
      toast.error(e?.message || 'Failed to save settings')
    }
  };

  const handleLogoUpload = async (file?: File) => {
    try{
      if (!file) return
      const { uploadLogo } = await import('../../lib/api')
      const { settings } = await uploadLogo(file)
      if (settings?.LOGO_URL) setLogoUrl(String(settings.LOGO_URL))
      toast.success('Logo uploaded')
    }catch(e:any){
      toast.error(e?.message || 'Logo upload failed')
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your laboratory's configuration and preferences</p>
        </div>
        <Button onClick={handleSave} className="bg-red-600 hover:bg-red-700" disabled={loadingSettings}>
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>This information appears on reports and in the interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Laboratory Name</Label>
              <Input value={orgName} onChange={(e)=>setOrgName(e.target.value)} />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input type="email" value={orgEmail} onChange={(e)=>setOrgEmail(e.target.value)} />
            </div>
            <div>
              <Label>Contact Phone Number</Label>
              <Input value={orgPhone} onChange={(e)=>setOrgPhone(e.target.value)} />
            </div>
            <div>
              <Label>Laboratory Address</Label>
              <Input value={orgAddress} onChange={(e)=>setOrgAddress(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Lab Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-gray-400 text-xs">No logo</span>
              )}
            </div>
            <div className="flex-1">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e)=>handleLogoUpload(e.target.files?.[0])}
                />
                <Button type="button" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Logo
                </Button>
              </label>
              <p className="text-xs text-gray-600 mt-2">Recommended size: 200x200px. PNG or JPG format.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analysis Preferences</CardTitle>
          <CardDescription>Default parameters for cell analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Default Confidence Threshold (0-1)</Label>
              <Input value={conf} onChange={(e)=>setConf(e.target.value)} placeholder="e.g. 0.25" />
              <p className="text-xs text-gray-600 mt-1">The minimum confidence score for a cell to be counted. Higher values are more strict.</p>
            </div>
            <div>
              <Label>Default WBC Count (WBCs/uL)</Label>
              <Input value={wbcsPerUlDefault} onChange={(e)=>setWbcsPerUlDefault(e.target.value)} />
              <p className="text-xs text-gray-600 mt-1">Used for calculations when no specific value is provided.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications & Alerts</CardTitle>
          <CardDescription>Control email alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Email Notifications</Label>
              <div className="mt-1">
                <input type="checkbox" id="notify-email" className="mr-2" checked={notifyEmails} onChange={(e)=>setNotifyEmails(e.target.checked)} />
                <label htmlFor="notify-email" className="text-sm text-gray-700">Receive email alerts for results</label>
              </div>
            </div>
            <div>
              <Label>Low Confidence Alerts</Label>
              <div className="mt-1">
                <input type="checkbox" id="notify-lowconf" className="mr-2" checked={lowConfAlerts} onChange={(e)=>setLowConfAlerts(e.target.checked)} />
                <label htmlFor="notify-lowconf" className="text-sm text-gray-700">Alert when confidence is below threshold</label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

