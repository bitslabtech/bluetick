import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Send, CheckCircle2, Star, Calendar, Clock, PenTool, UploadCloud, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import Confetti from 'react-confetti';

// Specialized Input Components
const countryCodes = [
    { code: '+91', label: '+91 (India)' },
    { code: '+1', label: '+1 (USA/Canada)' },
    { code: '+44', label: '+44 (UK)' },
    { code: '+61', label: '+61 (Australia)' },
    { code: '+81', label: '+81 (Japan)' },
    { code: '+49', label: '+49 (Germany)' },
    { code: '+33', label: '+33 (France)' },
    { code: '+39', label: '+39 (Italy)' },
    { code: '+86', label: '+86 (China)' },
    { code: '+7', label: '+7 (Russia/KZ)' },
    { code: '+55', label: '+55 (Brazil)' },
    { code: '+52', label: '+52 (Mexico)' },
    { code: '+34', label: '+34 (Spain)' },
    { code: '+27', label: '+27 (South Africa)' },
    { code: '+971', label: '+971 (UAE)' },
    { code: '+966', label: '+966 (Saudi Arabia)' },
    { code: '+65', label: '+65 (Singapore)' },
    { code: '+60', label: '+60 (Malaysia)' },
    { code: '+62', label: '+62 (Indonesia)' },
    { code: '+63', label: '+63 (Philippines)' }
];

const PhoneField = ({ value, onChange, required, minDigits, maxDigits, isDark, primaryColor }) => {
    const parentClass = `flex w-full rounded-xl outline-none text-base transition-all focus-within:ring-2 overflow-hidden ${isDark ? 'bg-white/5 border border-white/10 text-white shadow-inner shadow-black' : 'bg-slate-50 border border-slate-200 text-black shadow-inner shadow-slate-100'}`;
    const parsedCode = countryCodes.find(c => value && value.startsWith(c.code))?.code || '+91';

    let initialNum = value || '';
    if (initialNum.startsWith(parsedCode)) {
        initialNum = initialNum.slice(parsedCode.length).trim();
    }

    const [code, setCode] = useState(parsedCode);
    const [num, setNum] = useState(initialNum);

    useEffect(() => {
        if (num) onChange(`${code}${num}`);
        else if (value && !num) onChange('');
    }, [code, num]);

    const handleNumChange = (e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (maxDigits && digits.length > Number(maxDigits)) return; // hard cap
        setNum(digits);
    };

    const placeholder = minDigits
        ? (minDigits === maxDigits ? `${minDigits} digit number` : `${minDigits}–${maxDigits || '15'} digits`)
        : '1234567890';

    return (
        <div className={parentClass} style={{ '--tw-ring-color': primaryColor }}>
            <select
                value={code}
                onChange={e => setCode(e.target.value)}
                className={`outline-none px-3 py-4 font-bold border-r cursor-pointer shrink-0 ${isDark ? 'bg-black/40 border-white/10 hover:bg-black/60 text-white' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'}`}
                style={{ width: '35%', appearance: 'none', minWidth: 0 }}
            >
                {countryCodes.map(c => <option key={c.code} value={c.code} className={isDark ? 'bg-black' : 'bg-white'}>{c.label}</option>)}
            </select>
            <input
                type="tel"
                required={required}
                value={num}
                onChange={handleNumChange}
                placeholder={placeholder}
                maxLength={maxDigits ? Number(maxDigits) : 15}
                pattern={minDigits || maxDigits ? `.{${minDigits || 1},${maxDigits || 20}}` : undefined}
                title={minDigits ? `Enter ${minDigits === maxDigits ? minDigits : `${minDigits}–${maxDigits}`} digits` : undefined}
                className="px-4 py-4 bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-white/20 min-w-0"
                style={{ width: '65%' }}
            />
        </div>
    );
};

const RatingInput = ({ value, onChange, color }) => {
    return (
        <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onChange(i)}
                    className="p-2 transition-transform hover:scale-110 focus:outline-none"
                >
                    <Star className={`w-8 h-8 ${value >= i ? 'fill-current' : 'text-slate-200 dark:text-slate-700'}`} style={{ color: value >= i ? color : undefined }} />
                </button>
            ))}
        </div>
    );
};

// Simplified Signature Box
const SignaturePad = ({ value, onChange, color }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color || '#000';
        ctx.lineWidth = 3;
    }, [color]);

    const startDrawing = (e) => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        const pos = getPos(e);
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const ctx = canvasRef.current.getContext('2d');
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        setIsDrawing(false);
        onChange(canvasRef.current.toDataURL());
    };

    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const clear = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        onChange('');
    };

    return (
        <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-black/20">
            <canvas
                ref={canvasRef}
                width={400}
                height={200}
                className="w-full h-48 cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
            ></canvas>
            <div className="bg-slate-50 dark:bg-white/5 px-4 py-2 flex justify-between items-center border-t border-slate-200 dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Draw Signature</span>
                <button type="button" onClick={clear} className="text-xs font-bold text-slate-500 hover:text-red-500">Clear</button>
            </div>
        </div>
    );
};


const PublicForm = () => {
    const { id } = useParams();
    const [form, setForm] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    // Form data state
    const [formData, setFormData] = useState({});
    const [contactNumber, setContactNumber] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [paymentProcessing, setPaymentProcessing] = useState(false);
    const [platformName, setPlatformName] = useState(null); // null = not yet loaded
    const [fieldErrors, setFieldErrors] = useState({}); // { fieldId: 'error message' }

    // Multi-step state
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const fetchForm = async () => {
            try {
                const originalAuth = axios.defaults.headers.common['Authorization'];
                delete axios.defaults.headers.common['Authorization'];

                // Intelligent unique view tracking using sessionStorage to prevent React StrictMode duplicates and page refresh spam
                const sessionKey = `viewed_form_${id}`;
                const hasViewed = sessionStorage.getItem(sessionKey);
                const trackQuery = !hasViewed ? '?trackView=true' : '';

                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/forms/${id}${trackQuery}`);
                setForm(res.data);

                if (!hasViewed) {
                    sessionStorage.setItem(sessionKey, 'true');
                }

                if (originalAuth) axios.defaults.headers.common['Authorization'] = originalAuth;
            } catch (err) {
                console.error("Form fetch error", err);
                setError(err.response?.data?.msg || 'Form not found or is closed.');
            } finally {
                setLoading(false);
            }
        };

        fetchForm();

        // Fetch platform branding name from public settings
        axios.get(`${import.meta.env.VITE_API_URL}/api/settings/public`)
            .then(res => { if (res.data?.appName) setPlatformName(res.data.appName); })
            .catch(() => { });
    }, [id]);

    const handleFieldChange = (fieldId, value) => {
        setFormData(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleFileChange = (fieldId, e) => {
        const file = e.target.files[0];
        if (!file) return;
        // Mock file handling by storing filename and size for MVP
        handleFieldChange(fieldId, `[FILE] ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    };

    // Pagination Logic
    const fieldsPerPage = parseInt(form?.formLogic?.fieldsPerPage) || 3;
    const isMultiStep = form?.formLogic?.isMultiStep || false;
    const allFields = form?.fields || [];

    // Group fields into pages if multistep is enabled
    const fieldPages = [];
    if (isMultiStep && allFields.length > 0) {
        let currentPage = [];
        allFields.forEach((field, i) => {
            currentPage.push(field);
            if (currentPage.length === fieldsPerPage || i === allFields.length - 1) {
                fieldPages.push(currentPage);
                currentPage = [];
            }
        });
    } else {
        fieldPages.push(allFields);
    }

    // Derive contact number from form fields or explicit input
    const phoneField = allFields.find(f => f.type === 'phone');
    const emailField = allFields.find(f => f.type === 'email');
    const hasContactField = !!(phoneField || emailField);
    const needsExplicitContact = !hasContactField && (form?.restrictions?.preventDuplicates);

    // Resolved contact: prefer phone field answer, then email, then manual input
    const resolvedContact = phoneField ? (formData[phoneField.id] || '')
        : emailField ? (formData[emailField.id] || '')
            : contactNumber;

    const validateCurrentStep = () => {
        const currentFields = isMultiStep ? fieldPages[currentStep] : allFields;
        const errors = {};

        if (needsExplicitContact && currentStep === 0 && !contactNumber) {
            errors['__contact__'] = 'This field is required';
        }
        for (const field of currentFields) {
            if (field.required && !formData[field.id]) {
                errors[field.id] = 'This field is required';
            }
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            // Scroll to first error field
            const firstErrorId = Object.keys(errors)[0];
            const el = document.getElementById(`field-${firstErrorId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return false;
        }
        return true;
    };

    // Clear error for a field when user interacts with it
    const clearFieldError = (fieldId) => {
        if (fieldErrors[fieldId]) {
            setFieldErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n; });
        }
    };

    const nextStep = (e) => {
        e.preventDefault();
        if (validateCurrentStep()) {
            if (currentStep < fieldPages.length - 1) setCurrentStep(c => c + 1);
        }
    };

    const prevStep = (e) => {
        e.preventDefault();
        if (currentStep > 0) setCurrentStep(c => c - 1);
    };

    const loadScript = (src) => new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

    const initiatePayment = async (sessionData, primaryColorArg) => {
        setPaymentProcessing(true);
        try {
            const initRes = await axios.post(`${import.meta.env.VITE_API_URL}/api/checkout/init/${sessionData.sessionId}`);
            const data = initRes.data;

            if (data.gateway === 'razorpay') {
                const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
                if (!loaded) {
                    alert('Razorpay SDK failed to load. Are you online?');
                    return setPaymentProcessing(false);
                }

                const options = {
                    key: data.key,
                    amount: data.amount,
                    currency: data.currency,
                    name: form?.name || 'Checkout',
                    description: "Form Entry Payment",
                    order_id: data.order_id,
                    prefill: data.prefill,
                    theme: { color: primaryColorArg || '#6366f1' },
                    handler: async function (response) {
                        try {
                            setPaymentProcessing(true); // stay loading while verifying
                            await axios.post(`${import.meta.env.VITE_API_URL}/api/checkout/verify`, {
                                sessionId: sessionData.sessionId,
                                status: 'success',
                                gatewayResponse: response
                            });
                            setSubmitted(true);
                            // Clear session storage if you want them to be able to fill again, but duplicate rules handle it
                        } catch (err) {
                            alert('Payment successful, but verification failed.');
                            setSubmitError('Payment Verification Failed');
                        } finally {
                            setPaymentProcessing(false);
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            setPaymentProcessing(false);
                            setSubmitError('Payment was cancelled.');
                        }
                    }
                };
                const rzp = new window.Razorpay(options);
                rzp.open();
            } else if (data.gateway === 'stripe') {
                window.location.href = data.url;
            } else {
                alert(`Gateway ${data.gateway} integration pending.`);
                setPaymentProcessing(false);
            }
        } catch (err) {
            console.error('Checkout init error', err);
            setSubmitError(err.response?.data?.msg || 'Error initiating checkout.');
            setPaymentProcessing(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        if (!validateCurrentStep()) return;

        setSubmitting(true);
        try {
            const originalAuth = axios.defaults.headers.common['Authorization'];
            delete axios.defaults.headers.common['Authorization'];

            const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/forms/submit/${id}`, {
                contactNumber: resolvedContact || null,
                answers: formData
            });

            if (originalAuth) axios.defaults.headers.common['Authorization'] = originalAuth;

            if (res.data.paymentRequired) {
                const pColor = form?.brandConfig?.primaryColor || '#4f46e5';
                setSubmitting(false); // End standard submission loading
                initiatePayment(res.data, pColor);
                return;
            }

            setSubmitted(true);
        } catch (err) {
            console.error("Submission error", err);
            setSubmitError(err.response?.data?.msg || 'Error submitting form.');
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

    if (error || !form) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <div className="text-center bg-white dark:bg-black p-4 md:p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-white/10 max-w-md w-full mx-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Form Unavailable</h2>
                    <p className="text-slate-500">{error}</p>
                </div>
            </div>
        );
    }

    const { brandConfig = {}, theme = 'light' } = form;
    const primaryColor = brandConfig.primaryColor || '#4f46e5';
    const isDark = theme === 'dark';

    if (submitted) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 ${isDark ? 'bg-[#1C1C1E] text-white' : 'bg-slate-50 text-slate-900'}`}>
                <Confetti
                    width={window.innerWidth}
                    height={window.innerHeight}
                    recycle={false}
                    numberOfPieces={600}
                    gravity={0.15}
                />
                <div className={`w-full max-w-md p-10 rounded-3xl text-center shadow-2xl overflow-hidden relative z-10 ${isDark ? 'bg-black border border-white/10' : 'bg-white border shadow-sm border-slate-200'}`}>
                    <CheckCircle2 className="w-20 h-20 mx-auto mb-6" style={{ color: primaryColor }} />
                    <h1 className="text-3xl font-bold mb-3">Form Submitted</h1>
                    <p className={`mb-8 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Your response has been received. You may now close this window.
                    </p>
                </div>
            </div>
        );
    }

    const currentFieldsToRender = isMultiStep ? fieldPages[currentStep] : allFields;
    const totalSteps = isMultiStep ? fieldPages.length : 1;

    // Field rendering helper
    const renderField = (field) => {
        const inputClass = `w-full px-5 py-4 rounded-xl outline-none text-base transition-all focus:ring-2 ${isDark ? 'bg-white/5 border border-white/10 text-white placeholder:text-white/20' : 'bg-slate-50 border border-slate-200 text-black shadow-inner shadow-slate-100'}`;

        switch (field.type) {
            case 'text':
                return <input type="text" required={field.required} value={formData[field.id] || ''} onChange={e => handleFieldChange(field.id, e.target.value)} className={inputClass} placeholder="Your answer" style={{ '--tw-ring-color': primaryColor }} />;
            case 'phone':
                return <PhoneField value={formData[field.id] || ''} onChange={val => handleFieldChange(field.id, val)} required={field.required} minDigits={field.minDigits} maxDigits={field.maxDigits} isDark={isDark} primaryColor={primaryColor} />;
            case 'email':
                return <input type="email" required={field.required} value={formData[field.id] || ''} onChange={e => handleFieldChange(field.id, e.target.value)} className={inputClass} placeholder="name@example.com" style={{ '--tw-ring-color': primaryColor }} />;
            case 'number':
                return <input type="number" required={field.required} value={formData[field.id] || ''} min={field.minValue} max={field.maxValue} onChange={e => handleFieldChange(field.id, e.target.value)} className={inputClass} placeholder={field.minValue !== undefined ? `${field.minValue} – ${field.maxValue}` : 'Enter a number'} style={{ '--tw-ring-color': primaryColor }} />;
            case 'select':
                return (
                    <select required={field.required} value={formData[field.id] || ''} onChange={e => handleFieldChange(field.id, e.target.value)} className={`${inputClass} appearance-none bg-no-repeat`} style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundPosition: 'right 1rem center', backgroundSize: '1em', '--tw-ring-color': primaryColor }}>
                        <option value="" disabled>Select an option</option>
                        {(field.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                );
            case 'radio':
                return (
                    <div className="space-y-3 pt-1">
                        {(field.options || []).map((opt, i) => {
                            const isMulti = field.selectionMode === 'multiple';
                            const selected = isMulti
                                ? (Array.isArray(formData[field.id]) ? formData[field.id] : []).includes(opt)
                                : formData[field.id] === opt;
                            const toggle = () => {
                                if (isMulti) {
                                    const current = Array.isArray(formData[field.id]) ? formData[field.id] : [];
                                    handleFieldChange(field.id, selected ? current.filter(v => v !== opt) : [...current, opt]);
                                } else {
                                    handleFieldChange(field.id, opt);
                                }
                            };
                            return (
                                <label key={i} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selected ? 'border-transparent shadow-md' : isDark ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 shadow-sm'}`}
                                    style={selected ? { backgroundColor: `${primaryColor}15`, borderColor: primaryColor } : {}}>
                                    <div className={`w-5 h-5 flex items-center justify-center border-2 transition-all ${isMulti ? 'rounded-md' : 'rounded-full'} ${selected ? 'border-transparent' : 'border-slate-300'}`}
                                        style={selected ? { backgroundColor: primaryColor } : {}}>
                                        {selected && <span className="text-white text-xs font-bold">{isMulti ? '✓' : '●'}</span>}
                                    </div>
                                    <input
                                        type={isMulti ? 'checkbox' : 'radio'}
                                        name={`field_${field.id}`}
                                        value={opt}
                                        checked={selected}
                                        onChange={toggle}
                                        className="sr-only"
                                    />
                                    <span className="text-base font-medium">{opt}</span>
                                </label>
                            );
                        })}
                    </div>
                );
            case 'yesno':
                return (
                    <div className="flex gap-4">
                        {['Yes', 'No'].map(opt => (
                            <button key={opt} type="button" onClick={() => handleFieldChange(field.id, opt)}
                                className={`flex-1 py-4 rounded-xl font-bold text-base border-2 transition-all ${formData[field.id] === opt ? 'text-white border-transparent scale-[1.02] shadow-lg' : `${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}`}
                                style={formData[field.id] === opt ? { backgroundColor: primaryColor, boxShadow: `0 8px 20px -4px ${primaryColor}60` } : {}}>
                                {opt === 'Yes' ? '✅' : '❌'} {opt}
                            </button>
                        ))}
                    </div>
                );
            case 'date':
                return <input type="date" required={field.required} value={formData[field.id] || ''} onChange={e => handleFieldChange(field.id, e.target.value)} className={inputClass} style={{ '--tw-ring-color': primaryColor }} />;
            case 'time':
                return <input type="time" required={field.required} value={formData[field.id] || ''} onChange={e => handleFieldChange(field.id, e.target.value)} className={inputClass} style={{ '--tw-ring-color': primaryColor }} />;
            case 'file':
                return (
                    <div className={`relative w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-colors ${isDark ? 'border-white/20 bg-white/5 hover:bg-white/10' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                        <UploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                        <span className="text-sm font-bold text-slate-500 mb-1">Click to browse or drag file here</span>
                        <span className="text-xs text-slate-400">{formData[field.id] ? formData[field.id] : (field.acceptTypes || 'PDF, JPG, PNG (Max 5MB)')}</span>
                        <input type="file" accept={field.acceptTypes} required={field.required && !formData[field.id]} onChange={(e) => handleFileChange(field.id, e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                );
            case 'image':
                return (
                    <div className={`relative w-full rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-colors ${isDark ? 'border-white/20 bg-white/5 hover:bg-white/10' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}>
                        {formData[field.id] ? (
                            <img src={formData[field.id]} alt="Preview" className="max-h-40 rounded-lg object-contain mb-2" />
                        ) : (
                            <UploadCloud className="w-8 h-8 mb-3 text-slate-400" />
                        )}
                        <span className="text-sm font-bold text-slate-500 mb-1">{formData[field.id] ? 'Tap to change image' : 'Upload an image'}</span>
                        <span className="text-xs text-slate-400">{field.acceptTypes || 'PNG, JPG, GIF (Max 5MB)'}</span>
                        <input type="file" accept={field.acceptTypes || 'image/*'} required={field.required && !formData[field.id]} onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => handleFieldChange(field.id, reader.result);
                            reader.readAsDataURL(file);
                        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    </div>
                );
            case 'address':
                return (
                    <div className="space-y-3">
                        <input type="text" placeholder="Street address" value={(formData[field.id]?.street) || ''} onChange={e => handleFieldChange(field.id, { ...(formData[field.id] || {}), street: e.target.value })} className={inputClass} style={{ '--tw-ring-color': primaryColor }} />
                        <div className="flex gap-3">
                            <input type="text" placeholder="City" value={(formData[field.id]?.city) || ''} onChange={e => handleFieldChange(field.id, { ...(formData[field.id] || {}), city: e.target.value })} className={`${inputClass} flex-[7] min-w-0`} style={{ '--tw-ring-color': primaryColor }} />
                            <input type="text" placeholder="PIN / ZIP" value={(formData[field.id]?.zip) || ''} onChange={e => handleFieldChange(field.id, { ...(formData[field.id] || {}), zip: e.target.value })} className={`${inputClass} flex-[3] min-w-0`} style={{ '--tw-ring-color': primaryColor }} />
                        </div>
                        <input type="text" placeholder="State / Country" value={(formData[field.id]?.state) || ''} onChange={e => handleFieldChange(field.id, { ...(formData[field.id] || {}), state: e.target.value })} className={inputClass} style={{ '--tw-ring-color': primaryColor }} />
                    </div>
                );
            case 'rating':
                return <RatingInput value={formData[field.id] || 0} onChange={(val) => handleFieldChange(field.id, val)} color={primaryColor} />;
            case 'signature':
                return <SignaturePad value={formData[field.id] || ''} onChange={(val) => handleFieldChange(field.id, val)} color={isDark ? '#FFF' : '#000'} />;
            default:
                return null;
        }
    };

    return (
        <div className={`min-h-screen flex justify-center p-4 sm:p-8 font-sans ${isDark ? 'bg-[#1C1C1E] text-white' : 'bg-[#e5e7eb] text-slate-900'} relative`}>

            <div className={`w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl flex flex-col z-10 ${isDark ? 'bg-[#0B1120] border border-white/10' : 'bg-white border border-slate-200'}`}>

                {brandConfig.logoUrl && (
                    <div className="flex justify-center px-4 md:px-8 pt-4 pb-0 shrink-0">
                        <img src={brandConfig.logoUrl} alt="Organization Logo" className="h-[84px] object-contain" />
                    </div>
                )}

                <div className={`shrink-0 px-8 py-8 ${brandConfig.logoUrl ? 'pt-4' : ''}`}>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: brandConfig.logoUrl ? primaryColor : undefined }}>{form.name}</h1>
                    {form.description && (
                        <p className={`text-base leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {form.description}
                        </p>
                    )}
                </div>

                {isMultiStep && (
                    <div className="px-4 md:px-8 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Step {currentStep + 1} of {totalSteps}</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full transition-all duration-500 rounded-full" style={{ width: `${((currentStep + 1) / totalSteps) * 100}%`, backgroundColor: primaryColor }}></div>
                        </div>
                    </div>
                )}

                <form className="p-4 md:p-8 flex-1 space-y-8 overflow-y-auto">
                    {/* Only show explicit contact field if dedup is on and no phone/email field exists */}
                    {needsExplicitContact && currentStep === 0 && (
                        <div id="field-__contact__" className="space-y-2">
                            <label className={`block text-xs font-bold uppercase tracking-widest px-1 ${fieldErrors['__contact__'] ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                WhatsApp / Contact Number <span className="text-red-500">*</span>
                            </label>
                            <div className={fieldErrors['__contact__'] ? 'ring-2 ring-red-500 rounded-xl' : ''}>
                                <PhoneField
                                    value={contactNumber}
                                    onChange={(v) => { setContactNumber(v); clearFieldError('__contact__'); }}
                                    required={true}
                                    isDark={isDark}
                                    primaryColor={primaryColor}
                                />
                            </div>
                            {fieldErrors['__contact__'] && (
                                <p className="text-red-500 text-xs font-semibold px-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors['__contact__']}</p>
                            )}
                        </div>
                    )}

                    <div className="space-y-8">
                        {currentFieldsToRender.map((field) => (
                            <div key={field.id} id={`field-${field.id}`} className="space-y-2">
                                <label className={`block text-xs font-bold uppercase tracking-widest px-1 ${fieldErrors[field.id] ? 'text-red-500' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                </label>
                                <div
                                    className={fieldErrors[field.id] ? 'ring-2 ring-red-500 rounded-xl' : ''}
                                    onChange={() => clearFieldError(field.id)}
                                    onClick={() => clearFieldError(field.id)}
                                >
                                    {renderField(field)}
                                </div>
                                {fieldErrors[field.id] && (
                                    <p className="text-red-500 text-xs font-semibold px-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{fieldErrors[field.id]}</p>
                                )}
                            </div>
                        ))}
                    </div>

                    {submitError && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 mt-6 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <div className="text-sm font-medium">{submitError}</div>
                        </div>
                    )}

                    <div className="pt-8 mt-auto shrink-0 pb-4 flex gap-4">
                        {isMultiStep && currentStep > 0 && (
                            <button type="button" onClick={prevStep} className={`py-4 px-6 rounded-xl font-bold text-lg transition-colors flex items-center justify-center ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}>
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}

                        {isMultiStep && currentStep < totalSteps - 1 ? (
                            <button type="button" onClick={nextStep} className="flex-1 py-4 px-4 md:px-6 rounded-xl text-white font-bold text-lg shadow-xl flex justify-center items-center gap-2 transition-transform hover:scale-[1.02]" style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}60` }}>
                                Continue <ChevronRight className="w-5 h-5" />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSubmit} disabled={submitting || paymentProcessing} className="flex-1 py-4 px-4 md:px-6 rounded-xl text-white font-bold text-lg shadow-xl flex justify-center items-center gap-2 transition-transform hover:scale-[1.02] disabled:opacity-75 disabled:hover:scale-100" style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}60` }}>
                                {(submitting || paymentProcessing) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {submitting ? 'Transmitting...' : paymentProcessing ? 'Processing Payment...' : form?.paymentConfig?.requirePayment ? 'Pay & Submit' : 'Complete Submission'}
                            </button>
                        )}
                    </div>
                </form>

                {/* Professional Powered By Footer */}
                <div className={`shrink-0 w-full flex items-center justify-center py-4 px-4 ${isDark ? 'border-t border-white/5' : 'border-t border-slate-100'}`}>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all select-none ${isDark ? 'bg-white/5 text-white/40 hover:text-white/60' : 'bg-slate-50 text-slate-400 hover:text-slate-600'}`}>
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: primaryColor }}></span>
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: primaryColor }}></span>
                        </span>
                        <span>Powered by</span>
                        <a
                            href={window.location.origin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold hover:underline underline-offset-2 transition-colors"
                            style={{ color: primaryColor }}
                        >
                            {platformName ?? ''}
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PublicForm;
