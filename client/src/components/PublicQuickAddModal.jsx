import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ShoppingBag, Minus, Plus } from 'lucide-react';

/**
 * Pure CSS transition bottom-sheet modal.
 * Always mounted in the DOM - uses visibility/transform to show/hide
 * so there is ZERO mount-delay when opening.
 */
export default function PublicQuickAddModal({
    isOpen,
    onClose,
    product,
    store,
    cart,
    addToCart,
    updateQty,
    theme,
    imgUrl,
    cdnImg,
    cdnSrcSet,
    getCurrencySymbol,
    formatPrice
}) {
    // Track whether we're "visually open" (slightly delayed so CSS transition triggers)
    const [visible, setVisible] = useState(false);
    const prevProductRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            // Small rAF to let browser paint the translate-y-full state first,
            // then flip to translate-y-0 so the CSS transition fires immediately
            requestAnimationFrame(() => setVisible(true));
        } else {
            setVisible(false);
        }
    }, [isOpen]);

    // Reset options when product changes
    const [selectedOptions, setSelectedOptions] = useState({});
    useEffect(() => {
        if (product && product !== prevProductRef.current) {
            prevProductRef.current = product;
            const initial = {};
            if (product.options) {
                product.options.forEach(opt => {
                    if (opt.values && opt.values.length > 0) {
                        initial[opt.name] = opt.values[0];
                    }
                });
            }
            setSelectedOptions(initial);
        }
    }, [product]);

    const handleOptionSelect = (optName, val) => {
        setSelectedOptions(prev => ({ ...prev, [optName]: val }));
    };

    const matchedVariant = useMemo(() => {
        if (!product?.variants) return null;
        return product.variants.find(v => {
            if (!v.combo) return false;
            return Object.keys(selectedOptions).every(
                key => v.combo[key] === selectedOptions[key]
            );
        });
    }, [selectedOptions, product]);

    const currentPrice = product
        ? (matchedVariant?.price != null ? parseFloat(matchedVariant.price) : parseFloat(product.price))
        : 0;
    const originalPrice = product?.compareAtPrice ? parseFloat(product.compareAtPrice) : null;
    const isSale = originalPrice && originalPrice > currentPrice;

    const stockQuantity = matchedVariant?.stock != null ? matchedVariant.stock : product?.stockQuantity;
    const isOutOfStock = product?.trackQuantity ? stockQuantity <= 0 : !product?.inStock;
    const preventAdd = store?.inventoryConfig?.preventCartAdd && isOutOfStock;

    const cartItemId = product
        ? product.id + (Object.keys(selectedOptions).length > 0 ? '-' + JSON.stringify(selectedOptions) : '')
        : '';
    const cartItem = cart.find(item => (item.cartItemId || item.id) === cartItemId);
    const qtyInCart = cartItem ? cartItem.qty : 0;

    const handleAdd = () => {
        if (preventAdd || !product) return;
        addToCart({ ...product, cartItemId, selectedOptions, price: currentPrice }, 1, true);
    };

    // The outer wrapper is always in DOM but pointer-events-none when closed
    return (
        <div
            className="fixed inset-0 z-[9999]"
            style={{ pointerEvents: visible ? 'auto' : 'none' }}
            aria-hidden={!visible}
        >
            {/* Backdrop - pure CSS opacity transition */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.6)',
                    opacity: visible ? 1 : 0,
                    transition: 'opacity 220ms ease',
                    willChange: 'opacity',
                }}
            />

            {/* Sheet wrapper */}
            <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none">
                {/* Sheet panel - pure CSS translateY transition */}
                <div
                    style={{
                        transform: visible ? 'translateY(0) scale(1)' : 'translateY(100%) scale(0.95)',
                        opacity: visible ? 1 : 0,
                        transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1), opacity 320ms ease',
                        willChange: 'transform, opacity',
                        pointerEvents: visible ? 'auto' : 'none',
                    }}
                    className="w-full max-w-md bg-white rounded-t-[24px] sm:rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="font-bold text-gray-900 text-lg truncate pr-4">
                            Select Options
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content — only render internals when we have a product */}
                    {product && (
                        <>
                            <div className="overflow-y-auto p-5">
                                {/* Product summary */}
                                <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100">
                                    <div className="w-24 h-24 rounded-2xl border border-gray-100 overflow-hidden bg-white shrink-0">
                                        {product.imageUrls?.[0] ? (
                                            <img
                                                src={cdnImg(imgUrl(product.imageUrls[0]), { width: 200 })}
                                                alt={product.name}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                                <ShoppingBag className="w-8 h-8 text-gray-300" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2">{product.name}</h3>
                                        <div className="flex items-end gap-2">
                                            <span className="text-2xl font-black text-gray-900 leading-none">
                                                {getCurrencySymbol(store.currency)}{formatPrice(currentPrice)}
                                            </span>
                                            {isSale && (
                                                <span className="text-sm font-medium text-gray-400 line-through mb-0.5">
                                                    {getCurrencySymbol(store.currency)}{formatPrice(originalPrice)}
                                                </span>
                                            )}
                                        </div>
                                        {isOutOfStock && (
                                            <span className="inline-block mt-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                                Out of Stock
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Options */}
                                <div className="space-y-6">
                                    {(product.options || []).map((opt, i) => (
                                        <div key={i}>
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-gray-900 text-[15px]">Select {opt.name}</h4>
                                                <span className="text-xs font-medium text-gray-400">{selectedOptions[opt.name]}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2.5">
                                                {(opt.values || []).map(val => {
                                                    const isSelected = selectedOptions[opt.name] === val;
                                                    return (
                                                        <button
                                                            key={val}
                                                            onClick={() => handleOptionSelect(opt.name, val)}
                                                            className={`px-4 py-2.5 rounded-xl border-[1.5px] font-semibold text-sm transition-all active:scale-95 ${
                                                                isSelected
                                                                    ? 'border-gray-900 bg-gray-900 text-white shadow-md shadow-gray-900/20'
                                                                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {val}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-gray-100 bg-white">
                                {qtyInCart > 0 ? (
                                    <div className="flex items-center justify-between bg-black rounded-[20px] p-1 h-[56px] shadow-xl shadow-black/10">
                                        <button
                                            onClick={() => updateQty(cartItemId, -1)}
                                            className="w-14 h-full flex items-center justify-center rounded-[16px] hover:bg-white/10 active:scale-95 transition-all text-white"
                                        >
                                            <Minus className="w-5 h-5" />
                                        </button>
                                        <div className="flex flex-col items-center justify-center flex-1">
                                            <span className="text-lg font-black text-white leading-none">{qtyInCart}</span>
                                            <span className="text-[9px] font-bold text-white/60 uppercase tracking-wider mt-1">In Cart</span>
                                        </div>
                                        <button
                                            onClick={() => updateQty(cartItemId, 1)}
                                            className="w-14 h-full flex items-center justify-center rounded-[16px] hover:bg-white/10 active:scale-95 transition-all text-white"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleAdd}
                                        disabled={preventAdd}
                                        className={`w-full h-[56px] flex items-center justify-center gap-2 rounded-[20px] font-bold text-base transition-all active:scale-[0.98] ${
                                            preventAdd
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-black text-white hover:bg-gray-900 shadow-xl shadow-black/10'
                                        }`}
                                    >
                                        <ShoppingBag className="w-5 h-5" />
                                        {isOutOfStock ? 'Out of Stock' : `Add Item — ${getCurrencySymbol(store.currency)}${formatPrice(currentPrice)}`}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
