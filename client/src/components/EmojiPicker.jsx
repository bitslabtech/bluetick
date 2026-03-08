import React, { useState } from 'react';

const EMOJI_LIST = [
    '😀', '😁', '😂', '🤣', '😃', '😄', '😅', '😆', '😉', '😊', '😋', '😎', '😍', '😘', '🥰', '😗',
    '😙', '😚', '🙂', '🤗', '🤩', '🤔', '🤨', '😐', '😑', '😶', '🙄', '😏', '😣', '😥', '😮', '🤐',
    '😯', '😪', '😫', '🥱', '😴', '😌', '😛', '😜', '😝', '🤤', '😒', '😓', '😔', '😕', '🙃', '🤑',
    '😲', '☹️', '🙁', '😖', '😞', '😟', '😤', '😢', '😭', '😦', '😧', '😨', '😩', '🤯', '😬', '😰',
    '😱', '🥵', '🥶', '😳', '🤪', '😵', '😡', '😠', '🤬', '😷', '🤒', '🤕', '🤢', '🤮', '🥴', '😇',
    '🥳', '🥺', '🤠', '🤡', '🤥', '🤫', '🤭', '🧐', '🤓', '😈', '👿', '👋', '🤚', '🖐️', '✋', '🖖',
    '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎',
    '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '🦾', '🫂', '❤️', '🧡', '💛',
    '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟',
    '🔥', '✨', '⭐', '🌟', '💥', '❄️', '🌈', '☀️', '🌙', '⚡', '💫', '🎉', '🎊', '🎈', '🎁', '🏆',
    '✅', '❌', '⚠️', '💯', '🔔', '📢', '💬', '👀', '🙈', '🙉', '🙊', '💀', '👻', '🤖', '👾', '🎭',
];

const CATEGORIES = [
    { label: 'Smileys', emojis: EMOJI_LIST.slice(0, 48) },
    { label: 'Gestures', emojis: EMOJI_LIST.slice(48, 80) },
    { label: 'Hearts', emojis: EMOJI_LIST.slice(80, 100) },
    { label: 'Misc', emojis: EMOJI_LIST.slice(100) },
];

export default function EmojiPicker({ onSelect, onClose }) {
    const [activeCategory, setActiveCategory] = useState(0);
    const [search, setSearch] = useState('');

    const filtered = search
        ? EMOJI_LIST.filter(e => e.includes(search))
        : CATEGORIES[activeCategory].emojis;

    return (
        <div className="absolute bottom-16 left-2 z-50 bg-white dark:bg-[#233138] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-72 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Search */}
            <div className="p-2 border-b border-slate-100 dark:border-white/10">
                <input
                    type="text"
                    placeholder="Search emoji..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full text-sm px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white outline-none placeholder-slate-400"
                    autoFocus
                />
            </div>

            {/* Category tabs */}
            {!search && (
                <div className="flex border-b border-slate-100 dark:border-white/10">
                    {CATEGORIES.map((cat, i) => (
                        <button
                            key={cat.label}
                            onClick={() => setActiveCategory(i)}
                            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${activeCategory === i
                                    ? 'text-green-600 dark:text-green-400 border-b-2 border-green-500'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Emoji grid */}
            <div className="p-2 grid grid-cols-8 gap-0.5 max-h-48 overflow-y-auto">
                {filtered.map((emoji, i) => (
                    <button
                        key={i}
                        onClick={() => { onSelect(emoji); }}
                        className="text-xl hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg p-1 transition-colors leading-none"
                        title={emoji}
                    >
                        {emoji}
                    </button>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-8 text-center text-xs text-slate-400 py-4">No results</div>
                )}
            </div>
        </div>
    );
}
