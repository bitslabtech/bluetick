import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL}/api/setup`;

const STEPS = [
  { id: 1, label: 'System Check',   icon: '🖥️' },
  { id: 2, label: 'Database',       icon: '🗄️' },
  { id: 3, label: 'Admin Account',  icon: '👤' },
  { id: 4, label: 'App Identity',   icon: '🏷️' },
  { id: 5, label: 'WhatsApp / Meta',icon: '📱' },
  { id: 6, label: 'AI & Email',     icon: '✉️' },
  { id: 7, label: 'Install',        icon: '🚀' },
];

const Field = ({ label, hint, error, children }) => (
  <div className="mb-5">
    <label className="block text-sm font-semibold text-slate-200 mb-1">{label}</label>
    {hint && <p className="text-xs text-slate-400 mb-2">{hint}</p>}
    {children}
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

const Input = ({ value, onChange, placeholder, type = 'text', mono = false, disabled = false }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className={`w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition disabled:opacity-50 ${mono ? 'font-mono' : ''}`}
  />
);

const Btn = ({ onClick, disabled, children, variant = 'primary', className = '' }) => {
  const base = 'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'bg-white/10 hover:bg-white/15 text-slate-200',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const Check = ({ ok, label }) => (
  <div className={`flex items-center gap-3 p-3 rounded-lg ${ok ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-rose-500/10 border border-rose-500/20'}`}>
    <span className="text-lg">{ok ? '✅' : '❌'}</span>
    <span className={`text-sm font-medium ${ok ? 'text-emerald-300' : 'text-rose-300'}`}>{label}</span>
  </div>
);

export default function Setup() {
  const [step, setStep] = useState(1);
  const [sysInfo, setSysInfo] = useState(null);
  const [sysLoading, setSysLoading] = useState(true);
  const [prefill, setPrefill] = useState({});
  const [completed, setCompleted] = useState(false);
  const [installLoading, setInstallLoading] = useState(false);
  const [installError, setInstallError] = useState('');
  const [result, setResult] = useState(null);

  // Form state
  const [db, setDb] = useState({ host: 'localhost', port: '5432', name: 'whatsapp_saas', user: '', pass: '' });
  const [dbTested, setDbTested] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbError, setDbError] = useState('');
  const [admin, setAdmin] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [app, setApp] = useState({ appName: 'Bluetick', frontendUrl: '' });
  const [meta, setMeta] = useState({ fbClientId: '', fbClientSecret: '', webhookToken: '' });
  const [extras, setExtras] = useState({ geminiKey: '', smtpHost: '', smtpPort: '587', smtpUser: '', smtpPass: '', smtpFrom: '', smtpFromName: '' });

  useEffect(() => {
    axios.get(`${API}/status`).then(r => {
      setSysInfo(r.data.system);
      setPrefill(r.data.prefill || {});
      if (r.data.setupComplete) window.location.href = '/login';
    }).catch(() => setSysInfo({ error: true }))
      .finally(() => setSysLoading(false));
  }, []);

  useEffect(() => {
    if (prefill.db_host) setDb(p => ({ ...p, host: prefill.db_host, port: prefill.db_port || '5432', name: prefill.db_name || 'whatsapp_saas', user: prefill.db_user || '' }));
    if (prefill.frontend_url) setApp(p => ({ ...p, frontendUrl: prefill.frontend_url }));
    if (prefill.fb_client_id) setMeta(p => ({ ...p, fbClientId: prefill.fb_client_id }));
  }, [prefill]);

  // Auto-generate webhook token
  useEffect(() => {
    if (!meta.webhookToken) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      setMeta(p => ({ ...p, webhookToken: Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('') }));
    }
  }, []);

  const testDb = async () => {
    setDbTesting(true); setDbError(''); setDbTested(false);
    try {
      await axios.post(`${API}/test-database`, { host: db.host, port: db.port, database: db.name, username: db.user, password: db.pass });
      setDbTested(true);
    } catch (e) {
      setDbError(e.response?.data?.error || 'Connection failed');
    } finally { setDbTesting(false); }
  };

  const install = async () => {
    setInstallLoading(true); setInstallError('');
    try {
      const r = await axios.post(`${API}/complete`, {
        db_host: db.host, db_port: db.port, db_name: db.name, db_user: db.user, db_pass: db.pass,
        admin_name: admin.name, admin_email: admin.email, admin_phone: admin.phone, admin_password: admin.password,
        app_name: app.appName, frontend_url: app.frontendUrl,
        fb_client_id: meta.fbClientId, fb_client_secret: meta.fbClientSecret, webhook_verify_token: meta.webhookToken,
        gemini_api_key: extras.geminiKey,
        smtp_host: extras.smtpHost, smtp_port: extras.smtpPort, smtp_user: extras.smtpUser,
        smtp_pass: extras.smtpPass, smtp_from: extras.smtpFrom, smtp_from_name: extras.smtpFromName,
      });
      setResult(r.data);
      setCompleted(true);
    } catch (e) {
      setInstallError(e.response?.data?.error || 'Installation failed. Please check your inputs.');
    } finally { setInstallLoading(false); }
  };

  const sysOk = sysInfo && sysInfo.nodeOk && sysInfo.envWritable;

  const stepErrors = {
    2: !dbTested,
    3: !admin.name || !admin.email || !admin.phone || !admin.password || admin.password.length < 8 || admin.password !== admin.confirm,
    4: !app.frontendUrl,
  };

  const canNext = !stepErrors[step];

  const copy = (text) => navigator.clipboard.writeText(text).catch(() => {});

  if (sysLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Checking system...</p>
      </div>
    </div>
  );

  if (completed && result) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1e] p-4 md:p-6">
      <div className="max-w-lg w-full text-center">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="text-3xl font-black text-white mb-3">Installation Complete!</h1>
        <p className="text-slate-400 mb-8">Your Bluetick platform is configured and ready.</p>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6 text-left">
          <p className="text-amber-300 font-bold text-sm mb-2">⚡ One Last Step — Restart the Server</p>
          <p className="text-amber-200/70 text-xs mb-3">Run this command on your server for all settings to take full effect:</p>
          <div className="flex items-center gap-2 bg-black/40 rounded-lg p-3">
            <code className="text-emerald-400 text-xs flex-1">pm2 restart bluetick-api</code>
            <button onClick={() => copy('pm2 restart bluetick-api')} className="text-slate-400 hover:text-white text-xs">Copy</button>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-3">
          <p className="text-slate-300 font-bold text-sm">📋 Meta Webhook Configuration</p>
          <div>
            <p className="text-xs text-slate-500 mb-1">Webhook URL</p>
            <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
              <code className="text-blue-300 text-xs flex-1 break-all">{result.webhookUrl}</code>
              <button onClick={() => copy(result.webhookUrl)} className="text-slate-400 hover:text-white text-xs shrink-0">Copy</button>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Verify Token</p>
            <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
              <code className="text-purple-300 text-xs flex-1 font-mono break-all">{result.webhookToken}</code>
              <button onClick={() => copy(result.webhookToken)} className="text-slate-400 hover:text-white text-xs shrink-0">Copy</button>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.location.href = '/login'}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition text-sm"
        >
          Go to Login →
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.35s ease both; }
        .step-bar { background: linear-gradient(90deg,#6366f1,#8b5cf6); }
      `}</style>

      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col bg-white/3 border-r border-white/5 p-4 md:p-8">
        <div className="mb-10">
          <div className="text-2xl font-black text-white mb-1">⚡ Bluetick</div>
          <p className="text-xs text-slate-500">Installation Wizard</p>
        </div>
        <nav className="flex-1 space-y-1">
          {STEPS.map(s => {
            const done = s.id < step;
            const active = s.id === step;
            return (
              <div key={s.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600/20 border border-indigo-500/30' : done ? 'opacity-60' : 'opacity-30'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${active ? 'border-indigo-400 text-indigo-300' : done ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-slate-600 text-slate-500'}`}>
                  {done ? '✓' : s.id}
                </div>
                <span className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-400'}`}>{s.label}</span>
              </div>
            );
          })}
        </nav>
        <div className="mt-auto pt-8 border-t border-white/5">
          <p className="text-xs text-slate-600">Need help? Check the <span className="text-indigo-400">DEPLOYMENT.md</span> file in the docs folder.</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        {/* Top progress bar */}
        <div className="h-1 bg-white/5">
          <div className="step-bar h-full transition-all duration-500" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-4 md:p-12 flex flex-col items-center justify-center">
          <div className="w-full max-w-xl fade-up" key={step}>

            {/* Step header */}
            <div className="mb-8">
              <div className="text-4xl mb-3">{STEPS[step - 1].icon}</div>
              <h2 className="text-2xl font-black text-white">{STEPS[step - 1].label}</h2>
              <p className="text-sm text-slate-400 mt-1">Step {step} of {STEPS.length}</p>
            </div>

            {/* ── STEP 1: System Check ────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-3">
                {sysInfo?.error ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-300 text-sm">Cannot reach the setup API. Make sure the server is running on port 5000.</div>
                ) : <>
                  <Check ok={sysInfo?.nodeOk} label={`Node.js ${sysInfo?.nodeVersion} (v18+ required)`} />
                  <Check ok={sysInfo?.memOk} label={`Memory: ${sysInfo?.totalMemMB} MB total, ${sysInfo?.freeMemMB} MB free (512MB+ needed)`} />
                  <Check ok={sysInfo?.envWritable} label=".env file location is writable" />
                  <Check ok={sysInfo?.platform !== 'unknown'} label={`Platform: ${sysInfo?.platform}`} />
                  {!sysOk && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-300 text-sm mt-4">
                      Some checks failed. Please resolve the issues above before continuing.
                    </div>
                  )}
                </>}
              </div>
            )}

            {/* ── STEP 2: Database ────────────────────────────────── */}
            {step === 2 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="col-span-2"><Field label="Host" hint="Usually 'localhost' if PostgreSQL is on the same server">
                    <Input value={db.host} onChange={e => { setDb(p => ({ ...p, host: e.target.value })); setDbTested(false); }} placeholder="localhost" mono />
                  </Field></div>
                  <Field label="Port"><Input value={db.port} onChange={e => { setDb(p => ({ ...p, port: e.target.value })); setDbTested(false); }} placeholder="5432" mono /></Field>
                  <Field label="Database Name"><Input value={db.name} onChange={e => { setDb(p => ({ ...p, name: e.target.value })); setDbTested(false); }} placeholder="whatsapp_saas" mono /></Field>
                  <Field label="Username"><Input value={db.user} onChange={e => { setDb(p => ({ ...p, user: e.target.value })); setDbTested(false); }} placeholder="bluetick_user" mono /></Field>
                  <Field label="Password"><Input type="password" value={db.pass} onChange={e => { setDb(p => ({ ...p, pass: e.target.value })); setDbTested(false); }} placeholder="••••••••" /></Field>
                </div>
                {dbError && <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-300 text-sm mb-4">{dbError}</div>}
                {dbTested && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-300 text-sm mb-4">✅ Connection successful! You can proceed.</div>}
                <Btn onClick={testDb} disabled={dbTesting || !db.host || !db.name || !db.user || !db.pass} variant={dbTested ? 'success' : 'primary'}>
                  {dbTesting ? '⏳ Testing...' : dbTested ? '✅ Re-test Connection' : '🔌 Test Connection'}
                </Btn>
              </div>
            )}

            {/* ── STEP 3: Admin Account ───────────────────────────── */}
            {step === 3 && (
              <div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-indigo-300 text-xs mb-6">
                  This creates the Superadmin account. The first user registered on this platform automatically receives full admin access.
                </div>
                <Field label="Full Name"><Input value={admin.name} onChange={e => setAdmin(p => ({ ...p, name: e.target.value }))} placeholder="John Smith" /></Field>
                <Field label="Email Address"><Input type="email" value={admin.email} onChange={e => setAdmin(p => ({ ...p, email: e.target.value }))} placeholder="admin@yourdomain.com" /></Field>
                <Field label="WhatsApp Phone" hint="Include country code e.g. +91 98765 43210"><Input value={admin.phone} onChange={e => setAdmin(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" /></Field>
                <Field label="Password" hint="Minimum 8 characters" error={admin.password && admin.password.length < 8 ? 'Too short' : ''}><Input type="password" value={admin.password} onChange={e => setAdmin(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" /></Field>
                <Field label="Confirm Password" error={admin.confirm && admin.password !== admin.confirm ? 'Passwords do not match' : ''}>
                  <Input type="password" value={admin.confirm} onChange={e => setAdmin(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat password" />
                </Field>
              </div>
            )}

            {/* ── STEP 4: App Identity ────────────────────────────── */}
            {step === 4 && (
              <div>
                <Field label="App / Platform Name" hint="Shown in the UI, emails, and browser tab">
                  <Input value={app.appName} onChange={e => setApp(p => ({ ...p, appName: e.target.value }))} placeholder="Bluetick" />
                </Field>
                <Field label="Production Domain URL" hint="The full URL where this app is deployed. No trailing slash." error={app.frontendUrl && !app.frontendUrl.startsWith('http') ? 'Must start with http:// or https://' : ''}>
                  <Input value={app.frontendUrl} onChange={e => setApp(p => ({ ...p, frontendUrl: e.target.value }))} placeholder="https://yourdomain.com" mono />
                </Field>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-200 text-xs">
                  ⚠️ This URL is used for CORS, email links, and webhook configuration. Set it to your actual production domain. For local dev, use <code className="text-amber-300">http://localhost:5173</code>
                </div>
              </div>
            )}

            {/* ── STEP 5: WhatsApp / Meta ─────────────────────────── */}
            {step === 5 && (
              <div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-200 text-xs mb-6">
                  Get these from <strong>developers.facebook.com</strong> → Your App → Settings → Basic. These are optional — you can skip and configure later via the Superadmin dashboard.
                </div>
                <Field label="Facebook App ID (Optional)"><Input value={meta.fbClientId} onChange={e => setMeta(p => ({ ...p, fbClientId: e.target.value }))} placeholder="1234567890123456" mono /></Field>
                <Field label="Facebook App Secret (Optional)"><Input type="password" value={meta.fbClientSecret} onChange={e => setMeta(p => ({ ...p, fbClientSecret: e.target.value }))} placeholder="••••••••••••••••" /></Field>
                <Field label="Webhook Verify Token" hint="Auto-generated. Copy this and paste it in Meta Developer Dashboard → WhatsApp → Configuration → Verify Token">
                  <div className="flex gap-2">
                    <Input value={meta.webhookToken} onChange={e => setMeta(p => ({ ...p, webhookToken: e.target.value }))} mono />
                    <button onClick={() => copy(meta.webhookToken)} className="px-3 py-2 bg-white/10 hover:bg-white/15 text-slate-300 rounded-xl text-xs whitespace-nowrap">Copy</button>
                  </div>
                </Field>
                <div className="bg-white/5 rounded-xl p-4 text-xs">
                  <p className="text-slate-400 mb-2">Your Webhook URL (for Meta Dashboard):</p>
                  <div className="flex items-center gap-2">
                    <code className="text-blue-300 flex-1 break-all">{(app.frontendUrl || 'https://yourdomain.com').replace(/\/$/, '')}/api/webhook</code>
                    <button onClick={() => copy(`${(app.frontendUrl || '').replace(/\/$/, '')}/api/webhook`)} className="text-slate-400 hover:text-white">Copy</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 6: AI & Email ──────────────────────────────── */}
            {step === 6 && (
              <div>
                <p className="text-slate-400 text-sm mb-6">All fields on this page are optional. You can configure them later in the Superadmin dashboard.</p>
                <div className="border border-white/10 rounded-xl p-5 mb-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">🤖 Google Gemini AI</h3>
                  <Field label="Gemini API Key" hint="Get from: aistudio.google.com/app/apikey"><Input value={extras.geminiKey} onChange={e => setExtras(p => ({ ...p, geminiKey: e.target.value }))} placeholder="AIzaSy..." mono /></Field>
                </div>
                <div className="border border-white/10 rounded-xl p-5">
                  <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">📧 SMTP Email</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2"><Field label="SMTP Host"><Input value={extras.smtpHost} onChange={e => setExtras(p => ({ ...p, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" mono /></Field></div>
                    <Field label="Port"><Input value={extras.smtpPort} onChange={e => setExtras(p => ({ ...p, smtpPort: e.target.value }))} placeholder="587" mono /></Field>
                    <Field label="Username"><Input value={extras.smtpUser} onChange={e => setExtras(p => ({ ...p, smtpUser: e.target.value }))} placeholder="you@gmail.com" /></Field>
                    <div className="col-span-2"><Field label="Password / App Password"><Input type="password" value={extras.smtpPass} onChange={e => setExtras(p => ({ ...p, smtpPass: e.target.value }))} placeholder="••••••••" /></Field></div>
                    <Field label="From Email"><Input value={extras.smtpFrom} onChange={e => setExtras(p => ({ ...p, smtpFrom: e.target.value }))} placeholder="noreply@yourdomain.com" /></Field>
                    <Field label="From Name"><Input value={extras.smtpFromName} onChange={e => setExtras(p => ({ ...p, smtpFromName: e.target.value }))} placeholder="Bluetick" /></Field>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 7: Install ─────────────────────────────────── */}
            {step === 7 && (
              <div>
                <p className="text-slate-400 text-sm mb-6">Review your configuration below. Click Install to complete the setup.</p>
                <div className="space-y-3 mb-6 text-xs">
                  {[
                    ['Database', `${db.user}@${db.host}:${db.port}/${db.name}`],
                    ['Admin Email', admin.email],
                    ['Admin Phone', admin.phone],
                    ['App Name', app.appName],
                    ['Domain URL', app.frontendUrl],
                    ['Meta App ID', meta.fbClientId || '(not set — configure later)'],
                    ['Gemini AI Key', extras.geminiKey ? '••••••••' : '(not set — configure later)'],
                    ['SMTP Host', extras.smtpHost || '(not set — configure later)'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 p-3 bg-white/3 rounded-lg border border-white/5">
                      <span className="text-slate-400 shrink-0">{k}</span>
                      <span className="text-slate-200 text-right font-mono break-all">{v}</span>
                    </div>
                  ))}
                </div>
                {installError && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-300 text-sm mb-4">{installError}</div>
                )}
                <Btn onClick={install} disabled={installLoading} variant="success" className="w-full justify-center py-4 text-base">
                  {installLoading ? '⏳ Installing...' : '🚀 Install Bluetick'}
                </Btn>
                <p className="text-xs text-slate-500 mt-3 text-center">This will write your configuration and create your admin account.</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-10">
              <Btn onClick={() => setStep(s => s - 1)} disabled={step === 1} variant="secondary">← Back</Btn>
              {step < STEPS.length && (
                <Btn
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 1 && !sysOk || stepErrors[step] === true}
                  variant="primary"
                >
                  Continue →
                </Btn>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
