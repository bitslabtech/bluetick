import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useUI } from '../context/UIContext';
import { Turnstile } from '@marsidev/react-turnstile';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [turnstileToken, setTurnstileToken] = useState('');
    const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
    const { login } = useAuth();
    const { publicSettings, publicSettingsLoading } = useUI();
    const navigate = useNavigate();
    const location = useLocation();
    // The page the user was trying to reach before being redirected to login
    const fromState = location.state?.from;
    const from = typeof fromState === 'string' 
        ? fromState 
        : (fromState?.pathname ? fromState.pathname + (fromState.search || '') : null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        
        if (TURNSTILE_SITE_KEY && !turnstileToken) {
            setError('Please complete the security check.');
            return;
        }

        const res = await login(email, password, turnstileToken);
        if (res.success) {
            const isAdmin = res.user?.isAdmin || (res.token && JSON.parse(atob(res.token.split('.')[1])).user.isAdmin);
            const defaultDest = isAdmin ? '/superadmin' : '/dashboard';
            // Return to the originally requested deep link, otherwise go to default
            navigate(from && from !== '/login' ? from : defaultDest);
        } else {
            setError(res.error);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-md p-6 sm:p-4 md:p-8 space-y-6 bg-white rounded-xl shadow-lg border border-slate-100 mx-4 sm:mx-0">
                <div className="text-center space-y-2">
                    <div className="flex justify-center mb-4">
                        {publicSettings?.logoUrl ? (
                            <img src={publicSettings.logoUrl} alt="Logo" className="h-16 w-auto object-contain rounded-xl" />
                        ) : (
                            <div className="p-3 bg-primary rounded-xl">
                                <LayoutDashboard className="h-8 w-8 text-white" />
                            </div>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent mt-2">
                        Welcome Back
                    </h1>
                    <p className="text-slate-500">Sign in to your account</p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    {TURNSTILE_SITE_KEY && (
                        <div className="flex justify-center mt-4">
                            <Turnstile 
                                siteKey={TURNSTILE_SITE_KEY} 
                                onSuccess={(token) => setTurnstileToken(token)}
                                onError={() => setError('Captcha verification failed. Please refresh.')}
                                onExpire={() => setTurnstileToken('')}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-primary text-white rounded-lg hover:opacity-90 font-medium transition-colors shadow-sm shadow-blue-500/20"
                    >
                        Sign In
                    </button>
                </form>

                <div className="text-center text-sm text-slate-500">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-primary hover:opacity-80 font-medium">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
