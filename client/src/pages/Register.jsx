import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Check } from 'lucide-react';
import axios from 'axios';
import { useUI } from '../context/UIContext';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [selectedPlan, setSelectedPlan] = useState(null);
    const { register } = useAuth();
    const { publicSettings } = useUI();
    const navigate = useNavigate();
    const location = useLocation();

    // Get plan ID from URL
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const planId = searchParams.get('plan');

        if (planId) {
            // Fetch plan details
            fetchPlanDetails(planId);
        }
    }, [location]);

    const fetchPlanDetails = async (planId) => {
        try {
            const res = await axios.get('http://localhost:5000/api/plans');
            const plan = res.data.find(p => p.id === planId);
            if (plan) {
                setSelectedPlan(plan);
            }
        } catch (err) {
            console.error('Failed to fetch plan details', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Pass selected plan ID to backend
        const res = await register(name, email, password, selectedPlan?.id);

        if (res.success) {
            // If user selected a paid plan, redirect to checkout
            if (selectedPlan && selectedPlan.price > 0) {
                // Store plan info for checkout
                localStorage.setItem('pendingPlan', JSON.stringify(selectedPlan));
                navigate('/checkout');
            } else {
                // Direct registration or free plan - go to dashboard
                navigate('/dashboard');
            }
        } else {
            setError(res.error);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-slate-100">
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
                    <h2 className="text-xl font-bold text-slate-900">
                        {publicSettings?.appName || 'WaManager'}
                    </h2>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                        Create Account
                    </h1>
                    <p className="text-slate-500">Get started with {publicSettings?.appName || 'WhatsApp Bulk Sender'}</p>
                </div>

                {/* Selected Plan Display */}
                {selectedPlan && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                        <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                            <Check className="w-4 h-4 text-primary" />
                            Selected Plan: {selectedPlan.name}
                        </h3>
                        <p className="text-sm text-slate-600 mb-2">
                            ${selectedPlan.price}/month - {selectedPlan.description}
                        </p>
                        <ul className="text-xs text-primary space-y-1">
                            <li>• {selectedPlan.messageLimit} messages/month</li>
                            <li>• {selectedPlan.contactLimit} contacts</li>
                            <li>• {selectedPlan.templateLimit} templates</li>
                        </ul>
                    </div>
                )}

                {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Full Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            placeholder="John Doe"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
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
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2.5 bg-primary text-white rounded-lg hover:opacity-90 font-medium transition-colors shadow-sm shadow-blue-500/20"
                    >
                        {selectedPlan && selectedPlan.price > 0 ? 'Continue to Payment' : 'Create Account'}
                    </button>
                </form>

                <div className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary hover:opacity-80 font-medium">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
