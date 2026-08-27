import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Check, Shield, ArrowLeft, Loader, Tag, Calendar, MessageSquare, Users, Layout, AlertTriangle, Gift, X, Receipt, Building, Copy, CreditCard, Banknote, Clock, ChevronDown, ChevronUp, Edit, Sparkles, CheckCircle2, XCircle, Layers, Store, HardDrive, Zap } from 'lucide-react';
import { useUI } from '../context/UIContext';
import BillingProfileComp from '../components/BillingProfile';
import { usePayment } from '../hooks/usePayment';

const API = import.meta.env.VITE_API_URL || '';

const currencySymbol = (c) => ({ USD: '$', INR: '₹', EUR: '€', GBP: '£' }[c] || c || '₹');
const intervalLabel = (i) => i === 'year' ? 'per year' : i === 'lifetime' ? 'one-time' : 'per month';

const Checkout = () => {
    const [plan, setPlan] = useState(null);
    const [upgradeData, setUpgradeData] = useState(null);
    const [loading, setLoading] = useState(true);       // initial page load only
    const [recalculating, setRecalculating] = useState(false); // interval/plan switch (no full-page hide)
    const { initiatePayment, isProcessing } = usePayment();
    const [processing, setProcessing] = useState(false);

    // Coupons
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    const { showToast, showModal } = useUI();
    const navigate = useNavigate();
    const location = useLocation();

    // Track if user has a billing profile (to show GST warning)
    const [billingProfile, setBillingProfile] = useState(null);
    const [showGstModal, setShowGstModal] = useState(false);
    const [proceedWithoutGst, setProceedWithoutGst] = useState(false);

    // Manual payment state
    const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' | 'manual'
    const [utrNumber, setUtrNumber] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [bankDetails, setBankDetails] = useState(null);
    const [submittingManual, setSubmittingManual] = useState(false);
    const [screenshotFiles, setScreenshotFiles] = useState([]);
    const [screenshotPreviews, setScreenshotPreviews] = useState([]);
    const [screenshotUrls, setScreenshotUrls] = useState([]);
    const [uploadingScreenshot, setUploadingScreenshot] = useState(false);
    const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);

    // Pending Manual Request State
    const [pendingRequest, setPendingRequest] = useState(null);
    const [isEditingPendingRequest, setIsEditingPendingRequest] = useState(false);

    // Ref to the inline GST collapsible — used to expand + scroll to it
    // when user clicks "Add GST Details First" in the modal (avoids navigating
    // away from /checkout which would lose the applied coupon state).
    const [forceExpandGst, setForceExpandGst] = useState(false);
    const gstSectionRef = useRef(null);
    const [showFeatures, setShowFeatures] = useState(false);

    // Effect 1: On mount only — initialise plan from router state (preferred) or localStorage fallback
    // Using router state avoids localStorage race conditions when navigating from /billing
    useEffect(() => {
        // Priority 1: plan passed directly via navigate('/checkout', { state: { plan } })
        const routerPlan = location.state?.plan;
        if (routerPlan) {
            setPlan(routerPlan);
            setLoading(false);
            // Sync to localStorage so page-refresh still works
            localStorage.setItem('pendingPlan', JSON.stringify(routerPlan));
            return;
        }
        // Priority 2: fallback to localStorage (page refresh or direct URL access)
        const pendingPlanStr = localStorage.getItem('pendingPlan');
        if (!pendingPlanStr) {
            navigate('/billing');
            return;
        }
        try {
            const parsedPlan = JSON.parse(pendingPlanStr);
            setPlan(parsedPlan);
            setLoading(false);
        } catch {
            navigate('/billing');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Effect 2: Recalculate upgrade credit whenever the selected plan or interval changes.
    // Uses `recalculating` (not `loading`) so the full page is NOT hidden on interval switches.
    useEffect(() => {
        if (!plan) return; // wait until plan is set by Effect 1
        setRecalculating(true);
        setLoading(false); // ensure initial spinner is gone once plan is known
        axios.get(`${API}/api/billing/calculate-upgrade/${plan.name}?interval=${plan.interval || 'month'}`)
            .then(res => { setUpgradeData(res.data); })
            .catch(err => { console.error('Failed to calculate upgrade', err); })
            .finally(() => { setRecalculating(false); });
    }, [plan?.name, plan?.interval]); // recalculate on name or interval change

    // Fetch billing profile on mount to check completeness
    useEffect(() => {
        axios.get(`${API}/api/auth/billing-profile`)
            .then(r => setBillingProfile(r.data?.billingProfile || {}))
            .catch(() => setBillingProfile({}));
    }, []);

    // Fetch bank details for manual payment option
    useEffect(() => {
        axios.get(`${API}/api/system/manual-payment-config`)
            .then(r => setBankDetails(r.data?.manualPayment || null))
            .catch(() => setBankDetails(null));
    }, []);

    // Fetch pending manual payment request
    useEffect(() => {
        axios.get(`${API}/api/billing/pending-manual-request`)
            .then(r => {
                if (r.data?.pendingRequest) {
                    setPendingRequest(r.data.pendingRequest);
                }
            })
            .catch(err => console.error('Failed to fetch pending request', err));
    }, []);


    const isBillingProfileComplete = () => {
        const bp = billingProfile;
        if (!bp) return false;
        return bp.company && bp.gstin && bp.address && bp.state && bp.country && bp.pincode;
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setValidatingCoupon(true);
        try {
            const currentTotal = upgradeData ? upgradeData.finalPayableAmount : plan.price;
            const res = await axios.post(`${API}/api/coupons/validate`, {
                code: couponCode.trim(),
                planName: plan.name,
                planPrice: currentTotal,
                isUpgrade: upgradeData?.creditAmount > 0,
                interval: plan.interval
            });

            setAppliedCoupon(res.data);
            showToast({ type: 'success', title: 'Coupon Applied', message: res.data.message });
        } catch (err) {
            showToast({ type: 'error', title: 'Invalid Coupon', message: err.response?.data?.error || 'Failed to apply coupon.' });
            setAppliedCoupon(null);
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
    };

    const executePayment = async () => {
        const payload = {
            planName: plan.name,
            isUpgrade: upgradeData?.creditAmount > 0,
            couponCode: appliedCoupon ? appliedCoupon.code : null,
            interval: plan.interval || 'month',
            discountApplied: appliedCoupon ? appliedCoupon.calculatedDiscount : 0,
            successUrl: `${window.location.origin}/dashboard`,
            cancelUrl: window.location.href
        };

        await initiatePayment({
            createOrderUrl: `${API}/api/billing/create-order`,
            verifyUrl: `${API}/api/billing/verify-payment`,
            payload,
            onSuccess: (data) => {
                showToast({
                    type: 'success',
                    title: '🎉 Payment Successful!',
                    message: `You're now on the ${plan.name} plan. Enjoy your new features!`
                });
                localStorage.removeItem('pendingPlan');
                setTimeout(() => navigate('/dashboard'), 2000);
            }
        });
    };

    const handlePayment = async () => {
        // If billing profile is empty or incomplete, prompt user
        if (!isBillingProfileComplete() && !proceedWithoutGst) {
            setShowGstModal(true);
            return;
        }
        await executePayment();
    };

    const handleManualPayment = async () => {
        if (!utrNumber.trim()) {
            showToast({ type: 'error', title: 'UTR Required', message: 'Please enter the UTR / transaction reference number.' });
            return;
        }
        setSubmittingManual(true);
        try {
            if (isEditingPendingRequest && pendingRequest) {
                await axios.put(`${API}/api/billing/manual-payment-request/${pendingRequest.id}`, {
                    utrNumber: utrNumber.trim(),
                    note: paymentNote.trim(),
                    screenshotUrls
                });

                showToast({ type: 'success', title: 'Updated Successfully', message: 'Your payment request has been updated.' });

                // Refresh pending request
                const r = await axios.get(`${API}/api/billing/pending-manual-request`);
                setPendingRequest(r.data?.pendingRequest || null);
                setIsEditingPendingRequest(false);
            } else {
                const finalAmount = appliedCoupon ? appliedCoupon.finalPrice : (upgradeData ? upgradeData.finalPayableAmount : parseFloat(plan.price));
                await axios.post(`${API}/api/billing/manual-payment-request`, {
                    planName: plan.name,
                    interval: plan.interval || 'month',
                    couponCode: appliedCoupon ? appliedCoupon.code : null,
                    utrNumber: utrNumber.trim(),
                    note: paymentNote.trim(),
                    screenshotUrls
                });
                localStorage.removeItem('pendingPlan');
                navigate('/payment-pending', {
                    state: {
                        utrNumber: utrNumber.trim(),
                        planName: plan.name,
                        amount: finalAmount,
                        currency: plan.currency || 'INR'
                    }
                });
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to submit payment request. Please try again.';
            showToast({ type: 'error', title: 'Submission Failed', message: msg });
        } finally {
            setSubmittingManual(false);
        }
    };

    const handleScreenshotSelect = async (file) => {
        if (!file) return;
        if (screenshotUrls.length >= 3) {
            showToast({ type: 'error', title: 'Limit Reached', message: 'You can only upload up to 3 screenshots.' });
            return;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            showToast({ type: 'error', title: 'Invalid File', message: 'Only JPG, PNG, WebP, or GIF images are allowed.' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast({ type: 'error', title: 'File Too Large', message: 'Screenshot must be under 5MB.' });
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setScreenshotFiles(prev => [...prev, file]);
        setScreenshotPreviews(prev => [...prev, previewUrl]);
        setUploadingScreenshot(true);
        try {
            const formData = new FormData();
            formData.append('screenshot', file);
            const res = await axios.post(`${API}/api/billing/upload-payment-screenshot`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setScreenshotUrls(prev => [...prev, res.data.url]);
            showToast({ type: 'success', title: 'Screenshot Uploaded', message: 'Payment proof uploaded successfully.' });
        } catch (err) {
            // Revert preview on failure
            setScreenshotFiles(prev => prev.filter(f => f !== file));
            setScreenshotPreviews(prev => prev.filter(p => p !== previewUrl));
            showToast({ type: 'error', title: 'Upload Failed', message: err.response?.data?.error || 'Failed to upload screenshot.' });
        } finally {
            setUploadingScreenshot(false);
        }
    };

    const handleRemoveScreenshot = (indexToRemove) => {
        setScreenshotFiles(prev => prev.filter((_, i) => i !== indexToRemove));
        setScreenshotPreviews(prev => prev.filter((_, i) => i !== indexToRemove));
        setScreenshotUrls(prev => prev.filter((_, i) => i !== indexToRemove));
    };

    const startEditingPending = () => {
        setIsEditingPendingRequest(true);
        setUtrNumber(pendingRequest.manualPaymentRef || '');
        setPaymentNote(pendingRequest.manualPaymentNote || '');
        const urls = pendingRequest.paymentScreenshotUrls || [];
        setScreenshotUrls(urls);
        setScreenshotPreviews(urls); // We use the direct URLs for preview when editing
        setScreenshotFiles(urls.map(() => null)); // Placeholder for already uploaded files
    };

    const cancelEditingPending = () => {
        setIsEditingPendingRequest(false);
        setUtrNumber('');
        setPaymentNote('');
        setScreenshotUrls([]);
        setScreenshotPreviews([]);
        setScreenshotFiles([]);
    };


    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }
    if (!plan) return null;

    const sym = currencySymbol(plan.currency);
    const intLabel = intervalLabel(plan.interval);

    const baseMonthly = parseFloat(plan.monthlyPrice) || 0;
    let originalPrice = 0;
    let savePercentage = 0;
    let actualPrice = parseFloat(plan.price) || 0;

    if (upgradeData) {
        actualPrice = upgradeData.targetPlanPrice;
    } else if (plan.interval === 'year' && parseFloat(plan.yearlyPrice) > 0) {
        actualPrice = parseFloat(plan.yearlyPrice);
    } else if (plan.interval === 'half-year' && parseFloat(plan.halfYearlyPrice) > 0) {
        actualPrice = parseFloat(plan.halfYearlyPrice);
    }

    if (baseMonthly > 0) {
        if (plan.interval === 'year') {
            originalPrice = baseMonthly * 12;
            if (originalPrice > actualPrice) {
                savePercentage = Math.round(((originalPrice - actualPrice) / originalPrice) * 100);
            }
        } else if (plan.interval === 'half-year') {
            originalPrice = baseMonthly * 6;
            if (originalPrice > actualPrice) {
                savePercentage = Math.round(((originalPrice - actualPrice) / originalPrice) * 100);
            }
        }
    }

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 py-12 px-4">

                {/* GST Details Warning Modal */}
                {showGstModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-white/10 animate-in fade-in zoom-in-95 duration-200">
                            {/* Icon */}
                            <div className="flex justify-center mb-4">
                                <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                                    <Receipt className="w-7 h-7 text-amber-500" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                    Claim GST on This Purchase?
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Your billing & GST details are not filled in. If you are purchasing on behalf of a registered business, adding your GSTIN lets you claim the Input Tax Credit (ITC) on this invoice.
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                                    You can still proceed without GST details — the invoice will be generated in your name only.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        setShowGstModal(false);
                                        // Expand the inline GST form and scroll to it.
                                        // We do NOT navigate away — that would unmount the
                                        // component and lose the applied coupon state.
                                        setForceExpandGst(true);
                                        setTimeout(() => {
                                            gstSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
                                    }}
                                    className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20"
                                >
                                    <Receipt className="w-4 h-4" />
                                    Add GST Details First
                                </button>
                                <button
                                    onClick={() => {
                                        setShowGstModal(false);
                                        setProceedWithoutGst(true);
                                        setTimeout(() => {
                                            if (paymentMethod === 'manual') {
                                                setShowPaymentConfirmModal(true);
                                            } else {
                                                executePayment();
                                            }
                                        }, 50);
                                    }}
                                    className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors text-sm"
                                >
                                    Continue Without GST
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="max-w-6xl mx-auto">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-8 transition-colors font-medium"
                        disabled={processing || isProcessing}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Plans
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        {/* Left: Order Summary (3/5 width) */}
                        <div className="md:col-span-3 space-y-6">
                            {/* Plan Card */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-7 border border-slate-200 dark:border-white/10 shadow-sm">
                                {/* Header: Plan Identity & Badge */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-white/10">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase">Subscription Tier</span>
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-0.5">
                                            {plan.name} Plan
                                        </h2>
                                    </div>

                                </div>

                                {/* Included Products Strip */}
                                <div className="py-4 border-b border-slate-100 dark:border-white/10">
                                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">Core Features Included </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { name: 'WhatsApp API', desc: 'Cloud Platform', enabled: true },
                                            { name: 'Online Store', desc: 'E-Commerce', enabled: !!plan.allowWaStore },
                                            { name: 'Meta Ads', desc: 'Campaign Hub', enabled: !!plan.allowMetaAds },
                                            { name: 'Digital vCards', desc: 'Smart Profiles', enabled: !!plan.allowVcard }
                                        ].map((app, idx) => (
                                            <div key={idx} className={`flex items-center gap-2 p-2.5 rounded-xl border ${app.enabled ? 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-white/5' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 opacity-75'}`}>
                                                {app.enabled ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                                )}
                                                <div className="min-w-0">
                                                    <p className={`text-xs font-bold truncate ${app.enabled ? 'text-slate-800 dark:text-slate-200' : 'text-red-700 dark:text-red-400'}`}>{app.name}</p>
                                                    <p className={`text-[10px] truncate ${app.enabled ? 'text-slate-400 dark:text-slate-500' : 'text-red-400 dark:text-red-500/70'}`}>{app.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Billing Duration Cards (Clear & Impossible to miss) */}
                                <div className="py-5 border-b border-slate-100 dark:border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Select Billing Duration</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                        {[
                                            { id: 'month', label: 'Monthly', period: '1 Month', sub: 'Billed monthly', price: plan.monthlyPrice, original: plan.monthlyPrice, save: 0 },
                                            { id: 'half-year', label: 'Half-Yearly', period: '6 Months', sub: `≈ ${sym}${Math.round((plan.halfYearlyPrice || 0) / 6).toLocaleString()}/mo`, price: plan.halfYearlyPrice, original: (plan.monthlyPrice || 0) * 6, save: plan.monthlyPrice ? Math.round((((plan.monthlyPrice * 6) - plan.halfYearlyPrice) / (plan.monthlyPrice * 6)) * 100) : 0 },
                                            { id: 'year', label: 'Yearly', period: '1 Year', sub: `≈ ${sym}${Math.round((plan.yearlyPrice || 0) / 12).toLocaleString()}/mo`, price: plan.yearlyPrice, original: (plan.monthlyPrice || 0) * 12, save: plan.monthlyPrice ? Math.round((((plan.monthlyPrice * 12) - plan.yearlyPrice) / (plan.monthlyPrice * 12)) * 100) : 0 }
                                        ].map(int => {
                                            const isSelected = plan.interval === int.id;
                                            return (
                                                <button
                                                    key={int.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const newPlan = { ...plan, interval: int.id };
                                                        setPlan(newPlan);
                                                        localStorage.setItem('pendingPlan', JSON.stringify(newPlan));
                                                        setAppliedCoupon(null);
                                                        setCouponCode('');
                                                        setProceedWithoutGst(false);
                                                    }}
                                                    className={`relative w-full p-3 sm:p-4 rounded-xl text-left transition-all duration-200 cursor-pointer ${isSelected
                                                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-2 border-indigo-600 dark:border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                                                            : 'bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50/50'
                                                        }`}
                                                >
                                                    {int.save > 0 && (
                                                        <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black rounded-full shadow-sm tracking-wide uppercase">
                                                            SAVE {int.save}%
                                                        </span>
                                                    )}
                                                    
                                                    <div className="flex flex-row sm:flex-col sm:items-stretch items-center justify-between w-full">
                                                        
                                                        {/* Label & Desktop Radio */}
                                                        <div className="flex items-center justify-between flex-1 sm:flex-none sm:w-full sm:mb-2 pr-2 sm:pr-0">
                                                            <div>
                                                                <p className={`text-sm font-bold ${isSelected ? 'text-indigo-950 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                                                                    {int.label}
                                                                </p>
                                                                <p className="text-[11px] text-slate-400 font-medium hidden sm:block">{int.period}</p>
                                                            </div>
                                                            <div className={`hidden sm:flex shrink-0 w-4 h-4 rounded-full border-2 items-center justify-center transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                {isSelected && <div className="w-1.5 h-1.5 bg-white dark:bg-slate-900 rounded-full"></div>}
                                                            </div>
                                                        </div>

                                                        {/* Price, Sub & Mobile Radio */}
                                                        <div className="flex items-center sm:block gap-3 shrink-0 text-right sm:text-left sm:mt-2 sm:pt-2 sm:border-t border-slate-100 dark:border-white/5">
                                                            <div>
                                                                <div className="flex items-baseline gap-1.5 justify-end sm:justify-start">
                                                                    <span className={`text-base sm:text-lg font-black ${isSelected ? 'text-indigo-950 dark:text-white' : 'text-slate-900 dark:text-white'}`}>
                                                                        {sym}{parseFloat(int.price || 0).toLocaleString()}
                                                                    </span>
                                                                    {int.save > 0 && (
                                                                        <span className="text-[10px] sm:text-[11px] text-slate-400 line-through">
                                                                            {sym}{parseFloat(int.original || 0).toLocaleString()}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0 sm:mt-0.5 font-medium">{int.sub}</p>
                                                            </div>
                                                            <div className={`flex sm:hidden shrink-0 w-4 h-4 rounded-full border-2 items-center justify-center transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400' : 'border-slate-300 dark:border-slate-600'}`}>
                                                                {isSelected && <div className="w-1.5 h-1.5 bg-white dark:bg-slate-900 rounded-full"></div>}
                                                            </div>
                                                        </div>

                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Accordion: View Plan Features & Limits */}
                                <div className="py-3 border-b border-slate-100 dark:border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setShowFeatures(!showFeatures)}
                                        className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Layers className="w-4 h-4 text-indigo-500" />
                                            View Inclusions, Limits & Features
                                        </span>
                                        <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                            {showFeatures ? 'Hide Details' : 'Show Details'}
                                            {showFeatures ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </span>
                                    </button>

                                    {showFeatures && (
                                        <div className="mt-3 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/5 space-y-4 animate-in fade-in duration-150">
                                            {/* Quotas Grid */}
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                                                {[
                                                    { key: 'messageLimit', label: 'Messages', icon: MessageSquare },
                                                    { key: 'contactLimit', label: 'Contacts', icon: Users },
                                                    { key: 'templateLimit', label: 'Templates', icon: Layout },
                                                    { key: 'teamMemberLimit', label: 'Team', icon: Users },
                                                    { key: 'quickReplyLimit', label: 'Quick Replies', icon: Zap },
                                                    { key: 'tagLimit', label: 'Tags', icon: Tag },
                                                    { key: 'groupLimit', label: 'Groups', icon: Users },
                                                    { key: 'vcardLimit', label: 'veCards', icon: CreditCard },
                                                    { key: 'waStoreLimit', label: 'Stores', icon: Store },
                                                    { key: 'flowLimit', label: 'FlowBots', icon: Layers },
                                                ].map((lim, idx) => {
                                                    const val = plan[lim.key];
                                                    if (val === undefined || val === null) return null;
                                                    const Icon = lim.icon;
                                                    const isUnlimited = val === -1 || (val === 0 && lim.key === 'flowLimit');
                                                    const displayVal = isUnlimited ? 'Unlimited' : val.toLocaleString();
                                                    return (
                                                        <div key={idx} className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 text-center shadow-2xs">
                                                            <Icon className="w-4 h-4 text-indigo-500 mx-auto mb-1.5" />
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{lim.label}</p>
                                                            <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">{displayVal}</p>
                                                        </div>
                                                    );
                                                })}
                                                {/* Storage Limit */}
                                                {plan.storageLimitMb !== undefined && (
                                                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 text-center shadow-2xs">
                                                        <HardDrive className="w-4 h-4 text-indigo-500 mx-auto mb-1.5" />
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Storage</p>
                                                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                                                            {plan.storageLimitMb === 0 ? 'Unlimited' : `${plan.storageLimitMb} MB`}
                                                        </p>
                                                    </div>
                                                )}
                                                {/* AI Tokens */}
                                                {plan.aiTokensAllowance !== undefined && plan.aiTokensAllowance > 0 && (
                                                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 text-center shadow-2xs">
                                                        <Sparkles className="w-4 h-4 text-indigo-500 mx-auto mb-1.5" />
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">AI Tokens</p>
                                                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                                                            {plan.aiTokensAllowance.toLocaleString()}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Feature Grid */}
                                            {plan.features?.length > 0 && (
                                                <div className="pt-3 border-t border-slate-200/60 dark:border-white/5">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Feature Inclusions</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2.5">
                                                        {plan.features.map((f, i) => (
                                                            <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                                                <span className="leading-tight">{f}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Financial Line-Item Breakdown */}
                                <div className="pt-4 space-y-2.5">
                                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        <span>Plan Subscription ({intLabel})</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{sym}{upgradeData ? upgradeData.targetPlanPrice.toLocaleString() : actualPrice.toLocaleString()}</span>
                                    </div>

                                    {upgradeData && upgradeData.creditAmount > 0 && (
                                        <div className="flex justify-between items-center text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/30">
                                            <div>
                                                <p className="font-bold">Unused Plan Credit</p>
                                                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                                                    {upgradeData.remainingDays} days remaining from {upgradeData.currentPlanName} plan
                                                </p>
                                            </div>
                                            <span className="font-bold text-sm">-{sym}{upgradeData.creditAmount.toLocaleString()}</span>
                                        </div>
                                    )}

                                    {appliedCoupon && (
                                        <div className="flex justify-between items-center text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 p-2.5 rounded-lg border border-indigo-200/60 dark:border-indigo-800/30">
                                            <div>
                                                <p className="font-bold">Coupon ({appliedCoupon.code})</p>
                                                <p className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80">
                                                    {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% off` : 'Discount applied'}
                                                </p>
                                            </div>
                                            <span className="font-bold text-sm">-{sym}{appliedCoupon.calculatedDiscount.toLocaleString()}</span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <span>Taxes & GST</span>
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">Included</span>
                                    </div>

                                    <div className="flex justify-between items-baseline pt-3 border-t border-slate-200/80 dark:border-white/10 mt-2">
                                        <div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">Total Due Today</span>
                                            <p className="text-[10px] text-slate-400">Includes all taxes and discounts</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                                {sym}{appliedCoupon ? appliedCoupon.finalPrice.toLocaleString() : (upgradeData ? upgradeData.finalPayableAmount.toLocaleString() : parseFloat(plan.price).toLocaleString())}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Coupon Section */}
                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/10">
                                    {!appliedCoupon ? (
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                <Gift className="w-3.5 h-3.5" /> Have a Promo Code?
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    value={couponCode}
                                                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                                    placeholder="Enter coupon code"
                                                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono text-sm dark:text-white transition-all"
                                                    disabled={validatingCoupon}
                                                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                                />
                                                <button
                                                    onClick={handleApplyCoupon}
                                                    disabled={validatingCoupon || !couponCode.trim()}
                                                    className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50 transition-all text-sm flex items-center"
                                                >
                                                    {validatingCoupon ? <Loader className="w-4 h-4 animate-spin" /> : 'Apply'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1.5 bg-green-100 dark:bg-green-800/50 rounded-lg">
                                                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-green-800 dark:text-green-300">{appliedCoupon.code} applied!</div>
                                                    <div className="text-xs text-green-600 dark:text-green-400">Total updated successfully</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleRemoveCoupon}
                                                className="p-1.5 text-green-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Remove Coupon"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Security badges */}
                            <div className="flex flex-wrap gap-3">
                                {['256-bit SSL Encrypted', 'PCI DSS Compliant', 'Powered by Razorpay'].map(badge => (
                                    <span key={badge} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400 shadow-sm">
                                        <Shield className="w-3 h-3 text-green-500" />
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Right: Pay Button (2/5 width) */}
                        <div className="md:col-span-2">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 md:p-7 border border-slate-200 dark:border-white/10 shadow-sm sticky top-8">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Complete Purchase</h2>

                                {/* Payment Method Toggle */}
                                <div className="mb-5">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Payment Method</p>
                                    <div className={`gap-2 ${bankDetails?.enabled ? 'grid grid-cols-2' : 'flex'}`}>
                                        <button
                                            onClick={() => setPaymentMethod('online')}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-semibold flex-1 ${paymentMethod === 'online' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700'}`}
                                        >
                                            <CreditCard className="w-5 h-5" />
                                            <span className="text-xs">Online</span>
                                        </button>
                                        {bankDetails?.enabled && (
                                            <button
                                                onClick={() => {
                                                    setPaymentMethod('manual');
                                                    // Clear UTR when switching TO manual from online
                                                }}
                                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-semibold ${paymentMethod === 'manual' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-amber-300 dark:hover:border-amber-700'}`}
                                            >
                                                <Banknote className="w-5 h-5" />
                                                <span className="text-xs">Bank Transfer</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* GST Details Collapsible */}
                                <div className="mb-4" ref={gstSectionRef}>
                                    <BillingProfileComp
                                        compact={true}
                                        forceExpand={forceExpandGst}
                                        onSaved={(savedProfile) => {
                                            setBillingProfile(savedProfile);
                                            setForceExpandGst(false);
                                        }}
                                    />
                                </div>

                                {paymentMethod === 'online' ? (
                                    <>
                                        <div className="mb-5 p-3.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 rounded-xl flex items-start gap-3">
                                            <Shield className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-green-900 dark:text-green-300 mb-0.5">100% Secure Checkout</p>
                                                <p className="text-xs text-green-700 dark:text-green-400">Pay via Card, UPI, Net Banking, or Wallets</p>
                                            </div>
                                        </div>


                                        {/* Razorpay CTA */}
                                        <button
                                            onClick={handlePayment}
                                            disabled={processing || isProcessing || recalculating}
                                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {recalculating ? (
                                                <><Loader className="w-5 h-5 animate-spin" /> Recalculating price...</>
                                            ) : (processing || isProcessing) ? (
                                                <><Loader className="w-5 h-5 animate-spin" /> Opening Payment...</>
                                            ) : (
                                                <><Shield className="w-5 h-5" /> Pay {sym}{appliedCoupon ? appliedCoupon.finalPrice.toLocaleString() : (upgradeData ? upgradeData.finalPayableAmount.toLocaleString() : parseFloat(plan.price).toLocaleString())}</>
                                            )}
                                        </button>

                                        {/* Trial CTA — only shown when upgradeData is loaded and user hasn't used their trial */}
                                        {!loading && !recalculating && plan.trialDays > 0 && upgradeData && !upgradeData.hasUsedTrial && !upgradeData.isCurrentPlanPaid && (
                                            <button
                                                onClick={async () => {
                                                    setProcessing(true);
                                                    try {
                                                        await axios.post(`${API}/api/billing/start-trial`, { planName: plan.name });
                                                        localStorage.removeItem('pendingPlan');
                                                        showToast({ type: 'success', title: 'Trial Started', message: `Your ${plan.trialDays}-day free trial has started.` });
                                                        setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
                                                    } catch (err) {
                                                        console.error(err);
                                                        showToast({ type: 'error', title: 'Error', message: err.response?.data?.error || 'Failed to start trial.' });
                                                        setProcessing(false);
                                                    }
                                                }}
                                                disabled={processing || isProcessing}
                                                className="w-full mt-3 py-3.5 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-sm disabled:opacity-50 border border-emerald-200 dark:border-emerald-800/30 shadow-sm flex items-center justify-center gap-2"
                                            >
                                                <Gift className="w-4 h-4" /> Try {plan.trialDays} Days Free Trial
                                            </button>
                                        )}

                                        {/* Razorpay disclaimer */}
                                        <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                                A Razorpay payment popup will open. Complete the payment there. Do not close this tab until payment is confirmed.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {pendingRequest && !isEditingPendingRequest ? (
                                            <div className="bg-white dark:bg-[#1a1f36] rounded-2xl p-6 shadow-sm border border-amber-200 dark:border-amber-500/30">
                                                <div className="flex flex-col items-center justify-center text-center space-y-4 mb-6">
                                                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center border-4 border-amber-50 dark:border-amber-800/20">
                                                        <Clock className="w-8 h-8 text-amber-500" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">Request Pending</h3>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                                            You already have a manual payment request in progress.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5 mb-6">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-500 dark:text-slate-400">Transaction ID (UTR)</span>
                                                        <span className="font-mono font-bold text-slate-900 dark:text-white">{pendingRequest.manualPaymentRef || pendingRequest.transactionReference}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-slate-500 dark:text-slate-400">Amount Transferred</span>
                                                        <span className="font-bold text-slate-900 dark:text-white">{sym}{pendingRequest.amount.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-white/10 pt-3">
                                                        <span className="text-slate-500 dark:text-slate-400">Submitted On</span>
                                                        <span className="text-slate-900 dark:text-white font-medium">{new Date(pendingRequest.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <button
                                                        onClick={startEditingPending}
                                                        className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        <Edit className="w-4 h-4" /> Edit Submitted Details
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                await axios.delete(`${API}/api/billing/manual-payment-request/${pendingRequest.id}`);
                                                                setPendingRequest(null);
                                                                setPaymentMethod('online');
                                                            } catch (err) {
                                                                console.error('Failed to cancel request:', err);
                                                                showToast({ type: 'error', title: 'Action Failed', message: 'Could not cancel the request.' });
                                                            }
                                                        }}
                                                        className="w-full py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        Cancel & Pay Online Instead
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Bank Transfer Info */}
                                                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Building className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">Bank Transfer Details</p>
                                                    </div>
                                                    <div className="space-y-2 text-xs">
                                                        {[
                                                            { label: 'Account Name', value: bankDetails?.accountName },
                                                            { label: 'Account No.', value: bankDetails?.accountNumber },
                                                            { label: 'IFSC Code', value: bankDetails?.ifscCode },
                                                            { label: 'Bank', value: bankDetails?.bankName },
                                                            { label: 'UPI ID', value: bankDetails?.upiId },
                                                        ].filter(r => r.value).map((row, i) => (
                                                            <div key={i} className="flex justify-between items-center">
                                                                <span className="text-amber-700 dark:text-amber-400 font-medium">{row.label}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-mono font-semibold text-amber-900 dark:text-amber-200 text-right max-w-[140px] break-all">{row.value}</span>
                                                                    <button
                                                                        onClick={() => navigator.clipboard.writeText(row.value)}
                                                                        className="p-0.5 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded transition-colors"
                                                                        title="Copy"
                                                                    >
                                                                        <Copy className="w-3 h-3 text-amber-500" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {bankDetails?.instructions && (
                                                        <p className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/40 text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                                            {bankDetails.instructions}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Amount to Transfer */}
                                                <div className="mb-4 p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Transfer Exactly</span>
                                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-500 mt-0.5">{plan?.name} plan - {plan?.interval === 'year' ? '1 year' : plan?.interval === 'half-year' ? '6 months' : '1 month'}</span>
                                                    </div>
                                                    {recalculating ? (
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <Loader className="w-4 h-4 animate-spin" />
                                                            <span className="text-sm">Calculating...</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-lg font-black text-slate-900 dark:text-white">
                                                            {sym}{appliedCoupon ? appliedCoupon.finalPrice.toLocaleString() : (upgradeData ? upgradeData.finalPayableAmount.toLocaleString() : parseFloat(plan.price).toLocaleString())}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* UTR Input */}
                                                <div className="space-y-3 mb-4">

                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">
                                                            Additional Note <span className="text-slate-400 font-normal">(optional)</span>
                                                        </label>
                                                        <textarea
                                                            value={paymentNote}
                                                            onChange={e => setPaymentNote(e.target.value)}
                                                            placeholder="e.g. Transferred from HDFC account on 24th Aug"
                                                            rows={2}
                                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none text-sm dark:text-white transition-all resize-none"
                                                            disabled={submittingManual}
                                                        />
                                                    </div>
                                                    {/* Screenshot Upload */}
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                                                            <span className="flex items-center gap-1">Payment Screenshots <span className="text-red-500">*</span></span>
                                                            <span className="text-[10px] text-slate-400">{screenshotPreviews.length}/3 uploaded</span>
                                                        </label>

                                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                                            {screenshotPreviews.map((preview, idx) => (
                                                                <div key={idx} className="relative aspect-square">
                                                                    <img
                                                                        src={preview}
                                                                        alt={`Payment proof ${idx + 1}`}
                                                                        className="w-full h-full object-cover rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/10"
                                                                    />
                                                                    {!screenshotFiles[idx] && screenshotUrls[idx] && (
                                                                        <div className="absolute top-1 left-1 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                                                                            <svg className="w-2.5 h-2.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                                                        </div>
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveScreenshot(idx)}
                                                                        disabled={submittingManual || uploadingScreenshot}
                                                                        className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] p-1 rounded-full shadow-md transition-colors z-10"
                                                                        title="Remove image"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {screenshotPreviews.length < 3 && (
                                                            <label
                                                                className={`flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-all ${submittingManual || uploadingScreenshot
                                                                    ? 'border-slate-200 dark:border-white/5 opacity-50 cursor-not-allowed'
                                                                    : 'border-amber-300 dark:border-amber-700/50 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
                                                                    }`}
                                                                onDragOver={(e) => e.preventDefault()}
                                                                onDrop={(e) => { e.preventDefault(); if (!submittingManual && !uploadingScreenshot) handleScreenshotSelect(e.dataTransfer.files[0]); }}
                                                            >
                                                                <input
                                                                    type="file"
                                                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                                                    className="hidden"
                                                                    onChange={(e) => { if (!submittingManual && !uploadingScreenshot && e.target.files[0]) handleScreenshotSelect(e.target.files[0]); }}
                                                                    disabled={submittingManual || uploadingScreenshot}
                                                                />
                                                                {uploadingScreenshot ? (
                                                                    <div className="flex flex-col items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                                                        <Loader className="w-5 h-5 animate-spin" />
                                                                        <span className="text-xs font-semibold">Uploading...</span>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                        </svg>
                                                                        <span className="text-xs text-slate-500 dark:text-slate-400 text-center leading-tight">
                                                                            <span className="font-bold text-amber-600 dark:text-amber-400">Click to upload</span> or drag & drop<br />
                                                                            JPG, PNG, WebP · Max 5MB
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Submit CTA — opens confirmation modal first */}
                                                <button
                                                    onClick={() => {
                                                        if (!isBillingProfileComplete() && !proceedWithoutGst) {
                                                            setShowGstModal(true);
                                                        } else {
                                                            setShowPaymentConfirmModal(true);
                                                        }
                                                    }}
                                                    disabled={submittingManual || screenshotPreviews.length === 0 || uploadingScreenshot}
                                                    className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-amber-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    {submittingManual ? (
                                                        <><Loader className="w-5 h-5 animate-spin" /> {isEditingPendingRequest ? 'Updating Request...' : 'Submitting Request...'}</>
                                                    ) : (
                                                        <><Clock className="w-5 h-5" /> {isEditingPendingRequest ? 'Update Payment Details' : 'Submit Payment Request'}</>
                                                    )}
                                                </button>

                                                <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
                                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                                        ⚠️ Only submit after you have <strong>completed the bank transfer</strong>. Submitting without paying will delay or reject your activation.
                                                    </p>
                                                </div>

                                                {isEditingPendingRequest && (
                                                    <button
                                                        onClick={cancelEditingPending}
                                                        disabled={submittingManual}
                                                        className="w-full mt-3 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                                    >
                                                        Cancel Edit
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}

                                <button
                                    onClick={() => navigate('/billing')}
                                    disabled={processing || isProcessing || submittingManual}
                                    className="w-full mt-3 py-3.5 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm disabled:opacity-50 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center"
                                >
                                    Choose a Different Plan
                                </button>

                                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-4 leading-relaxed">
                                    By completing this purchase you agree to our Terms of Service and Privacy Policy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ManualPaymentConfirmModal
                open={showPaymentConfirmModal}
                onCancel={() => setShowPaymentConfirmModal(false)}
                onConfirm={() => { setShowPaymentConfirmModal(false); handleManualPayment(); }}
                submitting={submittingManual}
                amount={appliedCoupon ? appliedCoupon.finalPrice : (upgradeData ? upgradeData.finalPayableAmount : parseFloat(plan?.price || 0))}
                currency={plan?.currency || 'INR'}
                utrNumber={utrNumber}
            />
        </>
    );
};

// ── Manual Payment Confirmation Modal ─────────────────────────────────────────
function ManualPaymentConfirmModal({ open, onCancel, onConfirm, submitting, amount, currency, utrNumber }) {
    if (!open) return null;
    const sym = currency === 'INR' ? '₹' : '$';
    const checklist = [
        { id: 'transferred', label: 'I have transferred the exact amount to the bank account above' },
    ];
    const [checked, setChecked] = useState({});
    const allChecked = checklist.every(c => checked[c.id]);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={onCancel}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            {/* Modal */}
            <div
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-slate-900 dark:text-white font-bold text-lg leading-tight">Before You Submit</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Please confirm you've completed the transfer</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-5">
                    {/* Amount reminder */}
                    <div className="mb-5 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl flex items-center justify-between">
                        <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Amount you must have transferred</p>
                            <p className="text-xs text-blue-500 dark:text-blue-500 mt-0.5">Use NEFT / RTGS / IMPS to the bank details shown</p>
                        </div>
                        <span className="text-2xl font-black text-blue-700 dark:text-blue-300">{sym}{parseFloat(amount || 0).toLocaleString()}</span>
                    </div>

                    {/* Checklist */}
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Confirm all of the following:</p>
                    <div className="space-y-3 mb-6">
                        {checklist.map(item => (
                            <label
                                key={item.id}
                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none ${checked[item.id]
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/50'
                                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                    }`}
                            >
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${checked[item.id]
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-slate-300 dark:border-white/20 bg-white dark:bg-black/20'
                                    }`}>
                                    {checked[item.id] && (
                                        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={!!checked[item.id]}
                                    onChange={e => setChecked(prev => ({ ...prev, [item.id]: e.target.checked }))}
                                />
                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium leading-snug">
                                    {item.label}
                                </span>
                            </label>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={onConfirm}
                            disabled={!allChecked || submitting}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            {submitting ? (
                                <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Submitting...</>
                            ) : (
                                <><svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg> Yes, I've Paid — Submit Now</>
                            )}
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={submitting}
                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm transition-all"
                        >
                            Not Yet — Go Back & Complete Payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Checkout;


