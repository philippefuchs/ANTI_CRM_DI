import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 5000); // Auto remove after 5 seconds
    }, []);

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const getIcon = (type: ToastType) => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-emerald-500" />;
            case 'error': return <X size={20} className="text-rose-500" />; // Utilizing X as error icon wrapper often uses X for close, but here using as error symbol or AlertTriangle
            case 'info': return <AlertTriangle size={20} className="text-blue-500" />; // Using AlertTriangle as generic info or use Info icon
        }
    };

    // Refined icons
    const icons = {
        success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        error: <AlertTriangle className="w-5 h-5 text-rose-500" />,
        info: <AlertTriangle className="w-5 h-5 text-indigo-500" />
    };

    const borderColors = {
        success: 'border-emerald-500',
        error: 'border-rose-500',
        info: 'border-indigo-500'
    }

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`min-w-[300px] bg-white p-4 rounded-2xl shadow-2xl border-l-4 ${borderColors[toast.type]} flex items-center justify-between animate-in slide-in-from-right-full duration-300`}
                    >
                        <div className="flex items-center gap-3">
                            {icons[toast.type]}
                            <p className="text-sm font-bold text-slate-700">{toast.message}</p>
                        </div>
                        <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
