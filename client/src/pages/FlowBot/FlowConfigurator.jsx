import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, FolderOpen } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import MediaPickerModal, { MIME_PRESETS } from '../../components/MediaPickerModal';

const API_BASE = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const FlowConfigurator = ({ node, updateNodeData, onClose, onDelete }) => {
    const token = localStorage.getItem('token');
    // Local state to prevent constant re-renders on every keystroke in input fields
    const [localData, setLocalData] = useState(node.data || {});
    const [tags, setTags] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [customFields, setCustomFields] = useState([]);
    const [flows, setFlows] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isLoadingTags, setIsLoadingTags] = useState(false);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [isLoadingCustomFields, setIsLoadingCustomFields] = useState(false);
    const [isLoadingFlows, setIsLoadingFlows] = useState(false);
    const [isLoadingGroups, setIsLoadingGroups] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const [teamMembers, setTeamMembers] = useState([]);
    const [isLoadingTeam, setIsLoadingTeam] = useState(false);

    useEffect(() => {
        setLocalData(node.data || {});
    }, [node.id, node.data]);

    useEffect(() => {
        // Fetch dynamic data based on active node type
        if (node.type === 'actionNode') { fetchTags(); fetchGroups(); }
        if (node.type === 'templateNode') fetchTemplates();
        if (node.type === 'customFieldNode') fetchCustomFields();
        if (node.type === 'jumpNode') fetchFlows();
        if (node.type === 'handoffNode' || node.type === 'aiNode') fetchTeamMembers();
    }, [node.id, node.type]);

    const fetchTeamMembers = async () => {
        setIsLoadingTeam(true);
        try {
            const res = await axios.get(`${API_BASE}/api/team/for-assign`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTeamMembers(res.data || []);
        } catch (error) {
            console.error('Error fetching team members:', error);
        } finally {
            setIsLoadingTeam(false);
        }
    };

    const fetchTags = async () => {
        setIsLoadingTags(true);
        try {
            const res = await axios.get(`${API_BASE}/api/labels`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) setTags(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching tags:', error);
        } finally {
            setIsLoadingTags(false);
        }
    };

    const fetchGroups = async () => {
        setIsLoadingGroups(true);
        try {
            const res = await axios.get(`${API_BASE}/api/groups`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) setGroups(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setIsLoadingGroups(false);
        }
    };

    const fetchTemplates = async () => {
        setIsLoadingTemplates(true);
        try {
            const res = await axios.get(`${API_BASE}/api/templates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;
            setTemplates(Array.isArray(data) ? data.filter(t => t.status === 'APPROVED') : []);
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    const fetchCustomFields = async () => {
        setIsLoadingCustomFields(true);
        try {
            const res = await axios.get(`${API_BASE}/api/whatsapp/custom-fields`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data?.fields) setCustomFields(Array.isArray(res.data.fields) ? res.data.fields : []);
        } catch (error) {
            console.error('Error fetching custom fields:', error);
        } finally {
            setIsLoadingCustomFields(false);
        }
    };

    const fetchFlows = async () => {
        setIsLoadingFlows(true);
        try {
            const res = await axios.get(`${API_BASE}/api/flows`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) setFlows(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching flows:', error);
        } finally {
            setIsLoadingFlows(false);
        }
    };

    const handleMediaManagerSelect = (url) => {
        handleChanges({
            mediaUrl: url,
            originalName: url.split('/').pop(),
            sourceType: 'upload',
            mediaType: localData.mediaType || 'image'
        });
        setMediaPickerOpen(false);
    };

    // Upload media for template card headers (matches campaign flow)
    const handleCardMediaUpload = async (cardIdx, file) => {
        if (!file) return;

        // Immediately show local preview using blob URL (works even if Meta upload fails)
        const blobUrl = URL.createObjectURL(file);
        const params = {
            ...(localData.cardParams || {}),
            [`card_${cardIdx}_previewUrl`]: blobUrl,
            [`card_${cardIdx}_fileName`]: file.name
        };
        handleChange('cardParams', params);

        // Now attempt to upload to Meta for actual sending
        setIsUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await axios.post(`${API_BASE}/api/templates/upload-message-media`, fd, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });
            // Store the Meta media ID and server local URL alongside the preview
            const updatedParams = {
                ...(localData.cardParams || {}),
                [`card_${cardIdx}_previewUrl`]: blobUrl,
                [`card_${cardIdx}_fileName`]: file.name,
                [`card_${cardIdx}_headerMediaId`]: res.data.mediaId,
                [`card_${cardIdx}_headerLocalUrl`]: res.data.localUrl
            };
            handleChange('cardParams', updatedParams);
        } catch (error) {
            console.error('Card media upload to Meta failed:', error);
            // Preview still works — just won't have a Meta media ID until configured
        } finally {
            setIsUploading(false);
        }
    };

    const handleChange = (key, value) => {
        const newData = { ...localData, [key]: value };
        setLocalData(newData);
        updateNodeData(node.id, newData);
    };

    const handleChanges = (changes) => {
        const newData = { ...localData, ...changes };
        setLocalData(newData);
        updateNodeData(node.id, newData);
    };

    const handleButtonChange = (index, value) => {
        const btns = [...(localData.buttons || [])];
        btns[index] = value;
        handleChange('buttons', btns);
    };

    const addButton = () => {
        const btns = [...(localData.buttons || []), `Button ${(localData.buttons?.length || 0) + 1}`];
        if (btns.length <= 3) { // WhatsApp limit
            handleChange('buttons', btns);
        }
    };

    const removeButton = (index) => {
        const btns = localData.buttons.filter((_, i) => i !== index);
        handleChange('buttons', btns);
    };

    const renderConfigFields = () => {
        switch (node.type) {
            case 'triggerNode':
                return (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">When should this flow start?</label>

                            {/* Option 1: Specific Keyword */}
                            <div
                                onClick={() => handleChange('isAny', false)}
                                className={`p-3 rounded-lg border-2 cursor-pointer transition-all mb-2 ${!localData.isAny
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!localData.isAny ? 'border-indigo-500' : 'border-slate-400'
                                        }`}>
                                        {!localData.isAny && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                    </div>
                                    <span className="text-sm font-medium text-slate-800 dark:text-white">Specific Keyword(s)</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 ml-6">Flow starts when user types an exact word.</p>
                            </div>

                            {/* Option 2: Any Message */}
                            <div
                                onClick={() => handleChange('isAny', true)}
                                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${localData.isAny
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${localData.isAny ? 'border-indigo-500' : 'border-slate-400'
                                        }`}>
                                        {localData.isAny && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                    </div>
                                    <span className="text-sm font-medium text-slate-800 dark:text-white">Any Message</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1 ml-6">Flow starts for any unhandled incoming message.</p>
                            </div>
                        </div>

                        {/* Keyword Input — always visible when "Specific Keyword" is selected */}
                        {!localData.isAny && (
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    🔑 Trigger Keyword
                                </label>
                                <input
                                    type="text"
                                    value={localData.keyword || ''}
                                    onChange={(e) => handleChange('keyword', e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                    placeholder="e.g. START, HELLO, HELP"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-500 mt-2">Use commas to add multiple keywords. Case-insensitive.</p>
                            </div>
                        )}
                    </div>
                );

            case 'messageNode':
                return (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message Text</label>
                        <textarea
                            value={localData.text || ''}
                            onChange={(e) => handleChange('text', e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                            placeholder="Type your WhatsApp message..."
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                            Use <strong>{"{{vars.variable_name}}"}</strong> to show collected values or <strong>{"{{name}}"}</strong> for the contact's name.
                        </p>
                    </div>
                );

            case 'interactiveNode':
                const buttons = localData.buttons || [];
                return (
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Question / Body Text</label>
                            <textarea
                                value={localData.text || ''}
                                onChange={(e) => handleChange('text', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                                placeholder="e.g. Would you like to see our pricing?"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Buttons (Max 3)</label>
                                <span className="text-xs text-slate-500">{buttons.length}/3</span>
                            </div>

                            <div className="space-y-2">
                                {buttons.map((btn, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={btn}
                                            onChange={(e) => handleButtonChange(index, e.target.value)}
                                            maxLength={20}
                                            className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm font-medium"
                                        />
                                        <button
                                            onClick={() => removeButton(index)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-transparent hover:border-red-200 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {buttons.length < 3 && (
                                <button
                                    onClick={addButton}
                                    className="mt-3 w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Button
                                </button>
                            )}
                            <p className="text-xs text-slate-500 mt-2">Each button creates a new connection point.</p>
                        </div>
                    </div>
                );

            case 'delayNode':
                return (
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Wait for</label>
                            <input
                                type="number"
                                min="1"
                                value={localData.delayValue || ''}
                                onChange={(e) => handleChange('delayValue', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit</label>
                            <select
                                value={localData.delayUnit || 'minutes'}
                                onChange={(e) => handleChange('delayUnit', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                            >
                                <option value="seconds">Seconds</option>
                                <option value="minutes">Minutes</option>
                                <option value="hours">Hours</option>
                                <option value="days">Days</option>
                            </select>
                        </div>
                    </div>
                );

            case 'actionNode': {
                const currentActionType = localData.actionType || 'add_tag';
                const isTagAction = currentActionType === 'add_tag' || currentActionType === 'remove_tag';
                const isGroupAction = currentActionType === 'add_group' || currentActionType === 'remove_group';

                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Action Type</label>
                            <select
                                value={currentActionType}
                                onChange={(e) => {
                                    handleChange('actionType', e.target.value);
                                    handleChange('action', ''); // Reset selected value when switching type
                                }}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                            >
                                <optgroup label="Tags">
                                    <option value="add_tag">Add Tag</option>
                                    <option value="remove_tag">Remove Tag</option>
                                </optgroup>
                                <optgroup label="Groups">
                                    <option value="add_group">Add to Group</option>
                                    <option value="remove_group">Remove from Group</option>
                                </optgroup>
                                <optgroup label="Variables">
                                    <option value="set_variable">Set Variable</option>
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            {isTagAction ? (
                                isLoadingTags ? (
                                    <p className="text-xs text-slate-500 animate-pulse">Loading workspace tags...</p>
                                ) : (
                                    <select
                                        value={localData.action || ''}
                                        onChange={(e) => handleChange('action', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                    >
                                        <option value="" disabled>Choose a tag...</option>
                                        {Array.isArray(tags) && tags.map(tag => (
                                            <option key={tag._id || tag.id || tag.name} value={tag.name}>{tag.name}</option>
                                        ))}
                                    </select>
                                )
                            ) : isGroupAction ? (
                                isLoadingGroups ? (
                                    <p className="text-xs text-slate-500 animate-pulse">Loading groups...</p>
                                ) : groups.length === 0 ? (
                                    <p className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
                                        No groups found. Create groups in the Contacts page first.
                                    </p>
                                ) : (
                                    <select
                                        value={localData.action || ''}
                                        onChange={(e) => handleChange('action', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                    >
                                        <option value="" disabled>Choose a group...</option>
                                        {groups.map(g => (
                                            <option key={g.id} value={g.name}>{g.name}</option>
                                        ))}
                                    </select>
                                )
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Variable Name</label>
                                        <input
                                            type="text"
                                            value={localData.variable || ''}
                                            onChange={(e) => handleChange('variable', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                            placeholder="e.g. user_status"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Set Value To</label>
                                        <input
                                            type="text"
                                            value={localData.action || ''}
                                            onChange={(e) => handleChange('action', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                            placeholder="e.g. qualified, true, 100"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            }



            case 'aiNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">AI System Prompt</label>
                            <textarea
                                value={localData.prompt || ''}
                                onChange={(e) => handleChange('prompt', e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs resize-y"
                                placeholder="You are a helpful sales assistant. Answer questions concisely."
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Instructions on how the AI should behave.</p>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                            <label className="flex items-center gap-2 cursor-pointer mb-3">
                                <input
                                    type="checkbox"
                                    checked={localData.enableHandoff || false}
                                    onChange={(e) => handleChange('enableHandoff', e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Enable Human Handoff</span>
                            </label>

                            {localData.enableHandoff && (
                                <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 w-full overflow-hidden">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Handoff Triggers</label>
                                        <input
                                            type="text"
                                            value={localData.handoffTriggers || ''}
                                            onChange={(e) => handleChange('handoffTriggers', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm break-words whitespace-normal"
                                            placeholder="e.g. human, agent, support, manager"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1 break-words">Comma separated words that trigger handoff.</p>
                                    </div>
                                    <div className="w-full">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Transition Message</label>
                                        <input
                                            type="text"
                                            value={localData.handoffMessage || ''}
                                            onChange={(e) => handleChange('handoffMessage', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm break-words whitespace-normal"
                                            placeholder="Connecting you to an agent..."
                                        />
                                    </div>
                                    <div className="w-full">
                                        <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Assign To</label>
                                        <select
                                            value={localData.assignedTo || 'unassigned'}
                                            onChange={(e) => handleChange('assignedTo', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm w-full min-w-0"
                                        >
                                            <option value="unassigned">Unassigned (Inbox)</option>
                                            {teamMembers.map(member => (
                                                <option key={member.id} value={member.id}>{member.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'handoffNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assign To (Agent / Department)</label>
                            <select
                                value={localData.assignedTo || 'unassigned'}
                                onChange={(e) => handleChange('assignedTo', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                            >
                                <option value="unassigned">Leave Unassigned (Shared Inbox)</option>
                                {teamMembers.map(member => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-slate-500 mt-1">Chat will be routed to this user.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Internal Handoff Note</label>
                            <textarea
                                value={localData.message || ''}
                                onChange={(e) => handleChange('message', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                                placeholder="e.g. Customer wants to speak to billing team"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Visible to assigned agent only.</p>
                        </div>
                    </div>
                );

            case 'webhookNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Method</label>
                            <select
                                value={localData.method || 'GET'}
                                onChange={(e) => handleChange('method', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm font-mono uppercase"
                            >
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Endpoint URL</label>
                            <input
                                type="url"
                                value={localData.url || ''}
                                onChange={(e) => handleChange('url', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                placeholder="https://api.example.com/webhook"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Supports {'{{vars.variable_name}}'} interpolation.</p>
                        </div>
                        {(localData.method !== 'GET' && localData.method !== 'DELETE') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Body (JSON)</label>
                                <textarea
                                    value={localData.body || ''}
                                    onChange={(e) => handleChange('body', e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono resize-y"
                                    placeholder={'{\n  "userId": "{{vars.user_id}}"\n}'}
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Headers (JSON format)</label>
                            <textarea
                                value={localData.headers || ''}
                                onChange={(e) => handleChange('headers', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono resize-y"
                                placeholder={'{\n  "Authorization": "Bearer TOKEN"\n}'}
                            />
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Save Response To Variable (Optional)</label>
                            <input
                                type="text"
                                value={localData.variable || ''}
                                onChange={(e) => handleChange('variable', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                placeholder="e.g. api_response"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">The JSON response will be stringified and saved.</p>
                        </div>
                    </div>
                );

            case 'notifyNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recipient Email(s)</label>
                            <input
                                type="text"
                                value={localData.recipient || ''}
                                onChange={(e) => handleChange('recipient', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                placeholder="e.g. admin@company.com, sales@company.com"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Separate multiple emails with commas. Leave blank for "All Users".</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject / Title</label>
                            <input
                                type="text"
                                value={localData.subject || ''}
                                onChange={(e) => handleChange('subject', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                                placeholder="e.g. New Lead Captured!"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notification Message</label>
                            <textarea
                                value={localData.message || ''}
                                onChange={(e) => handleChange('message', e.target.value)}
                                rows={4}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-y"
                                placeholder="A new lead named {{vars.name}} just completed the flow."
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Supports {'{{vars.variable_name}}'} interpolation.</p>
                        </div>
                    </div>
                );

            case 'listNode': {
                const sections = localData.sections || [{ rows: [] }];
                const rows = sections[0]?.rows || [];

                const updateRow = (index, val) => {
                    const newRows = [...rows];
                    newRows[index] = val;
                    handleChange('sections', [{ ...sections[0], rows: newRows }]);
                };

                const removeRow = (index) => {
                    const newRows = rows.filter((_, i) => i !== index);
                    handleChange('sections', [{ ...sections[0], rows: newRows }]);
                };

                const addRow = () => {
                    if (rows.length < 10) {
                        const newRows = [...rows, `Option ${rows.length + 1}`];
                        handleChange('sections', [{ ...sections[0], rows: newRows }]);
                    }
                };

                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Menu Title</label>
                            <input type="text" value={localData.title || ''} onChange={(e) => handleChange('title', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm" placeholder="e.g. Select an Option" />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">List Options (Max 10)</label>
                                <span className="text-xs text-slate-500">{rows.length}/10</span>
                            </div>

                            <div className="space-y-2">
                                {rows.map((row, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={row}
                                            onChange={(e) => updateRow(index, e.target.value)}
                                            maxLength={24}
                                            className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm font-medium"
                                        />
                                        <button
                                            onClick={() => removeRow(index)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors border border-transparent hover:border-red-200"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {rows.length < 10 && (
                                <button
                                    onClick={addRow}
                                    className="mt-3 w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" /> Add Option
                                </button>
                            )}
                            <p className="text-xs text-slate-500 mt-2">Each option creates a select choice in WhatsApp.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Save answer to variable:</label>
                            <input
                                type="text"
                                value={localData.variable || ''}
                                onChange={(e) => handleChange('variable', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm font-mono"
                                placeholder="e.g. category_selection"
                            />
                        </div>
                    </div>
                );
            }

            case 'mediaNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Media Type</label>
                            <select
                                value={localData.mediaType || 'image'}
                                onChange={(e) => handleChange('mediaType', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                            >
                                <option value="image">Image</option>
                                <option value="video">Video</option>
                                <option value="document">Document</option>
                                <option value="audio">Audio</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Media Source</label>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-3">
                                <button
                                    onClick={() => handleChange('sourceType', 'upload')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${(!localData.sourceType || localData.sourceType === 'upload') ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    Media Manager
                                </button>
                                <button
                                    onClick={() => handleChange('sourceType', 'url')}
                                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${(localData.sourceType === 'url') ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    External URL
                                </button>
                            </div>

                            {(!localData.sourceType || localData.sourceType === 'upload') ? (
                                <div className="space-y-2">
                                    {localData.mediaUrl && localData.sourceType !== 'url' ? (
                                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-2">
                                            <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-2 truncate text-[10px] text-slate-500">
                                                {localData.originalName || localData.mediaUrl.split('/').pop() || 'File selected'}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setMediaPickerOpen(true)}
                                                    className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline"
                                                >
                                                    Change File
                                                </button>
                                                <span className="text-slate-300 dark:text-slate-700">|</span>
                                                <a href={localData.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 text-xs hover:underline">View File</a>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setMediaPickerOpen(true)}
                                            className="w-full border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl p-5 flex flex-col items-center gap-2 transition-all group"
                                        >
                                            <FolderOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Pick from Media Manager</span>
                                            <span className="text-[10px] text-slate-400">
                                                {localData.mediaType === 'image' ? 'Images (JPG, PNG, WebP)' :
                                                 localData.mediaType === 'video' ? 'Videos (MP4, WebM, 3GP)' :
                                                 localData.mediaType === 'audio' ? 'Audio files' :
                                                 'Documents (PDF, DOCX, CSV, TXT)'}
                                            </span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <input
                                        type="text"
                                        value={localData.mediaUrl || ''}
                                        onChange={(e) => handleChange('mediaUrl', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm font-mono"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Direct link to hosted media file.</p>
                                </div>
                            )}
                        </div>

                        {localData.mediaUrl && localData.mediaType !== 'audio' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Caption (Optional)</label>
                                <textarea
                                    value={localData.caption || ''}
                                    onChange={(e) => handleChange('caption', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
                                    placeholder="Add a caption to your media..."
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Supports variable interpolation like {"{{vars.name}}"}.</p>
                            </div>
                        )}

                        {localData.mediaUrl && (!localData.mediaType || localData.mediaType === 'image' || localData.mediaType === 'video') && (
                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Live Preview</p>
                                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                    {(!localData.mediaType || localData.mediaType === 'image') ? (
                                        <img src={localData.mediaUrl} alt="Preview" className="w-full h-32 object-contain" />
                                    ) : (
                                        <video src={localData.mediaUrl} className="w-full h-32 object-contain" controls />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'templateNode': {
                // Find the selected template object for dynamic fields
                const selectedTemplate = templates.find(t => t.name === localData.templateName) || null;

                // Extract {{1}}, {{2}}, etc. variable placeholders from template content
                const bodyVarMatches = selectedTemplate?.content?.match(/\{\{(\d+)\}\}/g) || [];
                const uniqueBodyVars = [...new Set(bodyVarMatches)].sort();

                // Check if it's a carousel template
                const isCarousel = selectedTemplate?.archetype === 'carousel';
                const cards = selectedTemplate?.cards || [];

                // Extract card-level variables for each card
                const getCardVars = (cardContent) => {
                    const matches = (cardContent || '').match(/\{\{(\d+)\}\}/g) || [];
                    return [...new Set(matches)].sort();
                };

                return (
                    <div className="space-y-4">
                        {/* Template Selector */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp Template</label>
                            {isLoadingTemplates ? (
                                <div className="flex items-center gap-2 py-3">
                                    <div className="w-4 h-4 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                    <p className="text-xs text-slate-500">Loading templates...</p>
                                </div>
                            ) : templates.length > 0 ? (
                                <select
                                    value={localData.templateName || ''}
                                    onChange={(e) => {
                                        const tmpl = templates.find(t => t.name === e.target.value);
                                        handleChanges({
                                            templateName: e.target.value,
                                            templateLanguage: tmpl?.language || 'en_US',
                                            templateCategory: tmpl?.category || '',
                                            templateId: tmpl?.id || '',
                                            templateVars: {},
                                            headerMediaUrl: '',
                                            cardParams: {}
                                        });
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                >
                                    <option value="" disabled>Select an approved template</option>
                                    {templates.map(t => (
                                        <option key={t.id || t.name} value={t.name}>
                                            {t.name} ({t.language}) {t.archetype === 'carousel' ? '🎠' : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="space-y-2">
                                    <input type="text" value={localData.templateName || ''} onChange={(e) => handleChange('templateName', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm" placeholder="e.g. welcome_message_1" />
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400">No approved templates found. Create and get templates approved in the Templates section first.</p>
                                </div>
                            )}
                        </div>

                        {/* ── SELECTED TEMPLATE DETAILS ── */}
                        {selectedTemplate && (
                            <>
                                {/* Meta Info Bar */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">{selectedTemplate.language}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">{selectedTemplate.category}</span>
                                    {isCarousel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 font-medium">🎠 Carousel · {cards.length} cards</span>}
                                </div>

                                {/* ── STANDARD TEMPLATE ── */}
                                {!isCarousel && (
                                    <>
                                        {/* Body Preview */}
                                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Body</span>
                                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mt-1">{selectedTemplate.content || 'No body text'}</p>
                                        </div>

                                        {/* Body Variable Inputs */}
                                        {uniqueBodyVars.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Body Variables</label>
                                                <div className="space-y-2">
                                                    {uniqueBodyVars.map(v => {
                                                        const varNum = v.replace(/[{}]/g, '');
                                                        return (
                                                            <div key={v} className="flex items-center gap-2">
                                                                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5 rounded-lg min-w-[48px] max-w-full text-center">{v}</span>
                                                                <input
                                                                    type="text"
                                                                    value={(localData.templateVars || {})[varNum] || ''}
                                                                    onChange={(e) => {
                                                                        const vars = { ...(localData.templateVars || {}), [varNum]: e.target.value };
                                                                        handleChange('templateVars', vars);
                                                                    }}
                                                                    className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                                                    placeholder={`Value for {{${varNum}}}`}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Buttons Preview */}
                                        {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buttons</span>
                                                <div className="space-y-1.5 mt-1">
                                                    {selectedTemplate.buttons.map((btn, i) => (
                                                        <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">{btn.type}</span>
                                                            <span className="text-slate-700 dark:text-slate-300 font-medium">{btn.text}</span>
                                                            {btn.url && <span className="text-slate-400 text-[10px] truncate ml-auto">{btn.url}</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ── CAROUSEL TEMPLATE ── */}
                                {isCarousel && (
                                    <>
                                        {/* Main Body (if present) */}
                                        {selectedTemplate.content && (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Main Body</span>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mt-1">{selectedTemplate.content}</p>
                                            </div>
                                        )}

                                        {/* Body Variables */}
                                        {uniqueBodyVars.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Main Body Variables</label>
                                                <div className="space-y-2">
                                                    {uniqueBodyVars.map(v => {
                                                        const varNum = v.replace(/[{}]/g, '');
                                                        return (
                                                            <div key={v} className="flex items-center gap-2">
                                                                <span className="text-xs font-mono text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1.5 rounded-lg min-w-[48px] max-w-full text-center">{v}</span>
                                                                <input type="text" value={(localData.templateVars || {})[varNum] || ''} onChange={(e) => { const vars = { ...(localData.templateVars || {}), [varNum]: e.target.value }; handleChange('templateVars', vars); }} className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm" placeholder={`Value for {{${varNum}}}`} />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Each Card */}
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cards ({cards.length})</span>
                                            {cards.map((card, cardIdx) => {
                                                const cardVars = getCardVars(card.content);
                                                return (
                                                    <div key={cardIdx} className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                        {/* Card Header */}
                                                        <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 flex items-center justify-between">
                                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Card {cardIdx + 1}</span>
                                                            {card.headerType && card.headerType !== 'NONE' && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 font-medium">Header: {card.headerType}</span>
                                                            )}
                                                        </div>
                                                        <div className="p-3 space-y-2">
                                                            {/* Card Header Media Upload */}
                                                            {card.headerType && ['IMAGE', 'VIDEO'].includes(card.headerType) && (
                                                                <div>
                                                                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                                                                        {card.headerType === 'IMAGE' ? '🖼️ Card Image' : '🎬 Card Video'}
                                                                        <span className="text-red-400 ml-1">*</span>
                                                                    </label>
                                                                    <label
                                                                        htmlFor={`flow-card-img-${cardIdx}`}
                                                                        className="flex items-center gap-2 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-2.5 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all group"
                                                                    >
                                                                        <div className="bg-sky-500/10 p-1.5 rounded-lg group-hover:bg-sky-500/20 transition-colors">
                                                                            <span className="text-sm">{card.headerType === 'IMAGE' ? '📷' : '🎬'}</span>
                                                                        </div>
                                                                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                                            {(localData.cardParams || {})[`card_${cardIdx}_fileName`]
                                                                                ? <span className="text-green-600 dark:text-green-400 font-medium">✓ {(localData.cardParams || {})[`card_${cardIdx}_fileName`]}</span>
                                                                                : 'Click to upload'
                                                                            }
                                                                        </span>
                                                                        <input
                                                                            id={`flow-card-img-${cardIdx}`}
                                                                            type="file"
                                                                            accept={card.headerType === 'IMAGE' ? 'image/*' : 'video/*'}
                                                                            className="hidden"
                                                                            onChange={(e) => handleCardMediaUpload(cardIdx, e.target.files[0])}
                                                                        />
                                                                    </label>
                                                                    {(localData.cardParams || {})[`card_${cardIdx}_previewUrl`] && card.headerType === 'IMAGE' && (
                                                                        <img src={(localData.cardParams || {})[`card_${cardIdx}_previewUrl`]} alt={`Card ${cardIdx + 1}`} className="w-full h-24 object-cover rounded-lg mt-1.5 border border-slate-200 dark:border-slate-700" />
                                                                    )}
                                                                    {(localData.cardParams || {})[`card_${cardIdx}_previewUrl`] && card.headerType === 'VIDEO' && (
                                                                        <video src={(localData.cardParams || {})[`card_${cardIdx}_previewUrl`]} className="w-full h-24 object-cover rounded-lg mt-1.5 border border-slate-200 dark:border-slate-700" muted />
                                                                    )}
                                                                    <p className="text-[10px] text-slate-400 mt-1">Uploaded to Meta for sending.</p>
                                                                </div>
                                                            )}

                                                            {/* Card Body */}
                                                            {card.content && (
                                                                <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{card.content}</p>
                                                            )}

                                                            {/* Card Body Variables */}
                                                            {cardVars.length > 0 && (
                                                                <div className="space-y-1.5">
                                                                    {cardVars.map(v => {
                                                                        const varNum = v.replace(/[{}]/g, '');
                                                                        const paramKey = `card_${cardIdx}_var_${varNum}`;
                                                                        return (
                                                                            <div key={v} className="flex items-center gap-2">
                                                                                <span className="text-[10px] font-mono text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-900/20 px-1.5 py-1 rounded min-w-[40px] max-w-full text-center">{v}</span>
                                                                                <input
                                                                                    type="text"
                                                                                    value={(localData.cardParams || {})[paramKey] || ''}
                                                                                    onChange={(e) => {
                                                                                        const params = { ...(localData.cardParams || {}), [paramKey]: e.target.value };
                                                                                        handleChange('cardParams', params);
                                                                                    }}
                                                                                    className="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-xs"
                                                                                    placeholder={`Card ${cardIdx + 1} variable ${varNum}`}
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}

                                                            {/* Card Buttons */}
                                                            {card.buttons && card.buttons.length > 0 && (
                                                                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Buttons</span>
                                                                    {card.buttons.map((btn, bIdx) => (
                                                                        <div key={bIdx} className="space-y-1">
                                                                            <div className="flex items-center gap-1.5 text-[10px]">
                                                                                <span className="px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">{btn.type}</span>
                                                                                <span className="text-slate-600 dark:text-slate-400 font-medium">{btn.text}</span>
                                                                            </div>
                                                                            {btn.type === 'URL' && (
                                                                                <input
                                                                                    type="text"
                                                                                    value={(localData.cardParams || {})[`card_${cardIdx}_btn_${bIdx}_url`] || btn.url || ''}
                                                                                    onChange={(e) => {
                                                                                        const params = { ...(localData.cardParams || {}), [`card_${cardIdx}_btn_${bIdx}_url`]: e.target.value };
                                                                                        handleChange('cardParams', params);
                                                                                    }}
                                                                                    className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-[10px] font-mono"
                                                                                    placeholder={btn.url || 'https://...'}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        <p className="text-xs text-slate-500">Only approved WhatsApp templates will deliver successfully.</p>
                    </div>
                );
            }

            case 'locationNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Request Message</label>
                            <textarea
                                value={localData.text || ''}
                                onChange={(e) => handleChange('text', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                placeholder="e.g. Please share your delivery location"
                            />
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">This text appears above the "Send Location" button in WhatsApp.</p>
                        </div>

                        {/* WhatsApp Preview */}
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preview</span>
                            <div className="bg-[#e5ddd5] dark:bg-slate-800 rounded-xl p-3 mt-1.5">
                                <div className="bg-white dark:bg-[#2f455a] rounded-xl rounded-tl-none p-3 max-w-[85%] shadow-sm">
                                    <p className="text-sm text-slate-800 dark:text-white leading-relaxed">{localData.text || 'Please share your location'}</p>
                                    <div className="mt-2 border-t border-slate-100 dark:border-white/10 pt-2">
                                        <div className="flex items-center justify-center gap-2 text-blue-500 font-medium text-sm py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-default">
                                            <span>📍</span>
                                            <span>Send Location</span>
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-gray-400 block text-right mt-1">10:30 AM</span>
                                </div>
                            </div>
                        </div>

                        {/* How it works info */}
                        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 border border-slate-200 dark:border-white/10">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">ℹ️ How it works</p>
                            <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                                <li>The user sees a <strong>"Send Location"</strong> button in WhatsApp</li>
                                <li>The flow <strong>pauses</strong> until they share their location</li>
                                <li>If they reply with text instead, the request is re-sent</li>
                            </ul>
                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-3 mb-1.5 uppercase tracking-wider">Saved Variables</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {['last_location_lat', 'last_location_lng', 'last_location_name', 'last_location_address'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => {
                                            navigator.clipboard.writeText(`{{vars.${v}}}`);
                                            toast.success(`Copied {{vars.${v}}}`);
                                        }}
                                        className="group relative flex items-center justify-between text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-700 transition-all text-left"
                                        title={`Click to copy {{vars.${v}}}`}
                                    >
                                        <span className="truncate mr-2">{v}</span>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px]">📋</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'conditionNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Variable</label>
                            <input
                                type="text"
                                value={localData.variable || ''}
                                onChange={(e) => handleChange('variable', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                placeholder="e.g. {{vars.name}}"
                            />
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Include double curly braces for variables.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Operator</label>
                            <select
                                value={localData.operator || '=='}
                                onChange={(e) => handleChange('operator', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                            >
                                <option value="==">Equals</option>
                                <option value="!=">Not Equals</option>
                                <option value=">">Greater Than</option>
                                <option value="<">Less Than</option>
                                <option value="contains">Contains</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Value To Match</label>
                            <input
                                type="text"
                                value={localData.value || ''}
                                onChange={(e) => handleChange('value', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                placeholder="Value to compare against"
                            />
                        </div>
                    </div>
                );

            case 'splitNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Path A Percentage ({localData.splitRatio || 50}%)</label>
                            <input
                                type="range"
                                min="1"
                                max="99"
                                value={localData.splitRatio || 50}
                                onChange={(e) => handleChange('splitRatio', parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                <span>1%</span>
                                <span>50%</span>
                                <span>99%</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 italic shadow-sm bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-white/5">
                                Path B will receive <strong>{100 - (localData.splitRatio || 50)}%</strong> of traffic.
                            </p>
                        </div>
                    </div>
                );

            case 'jumpNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Target Flow</label>
                            {isLoadingFlows ? (
                                <p className="text-xs text-slate-500 animate-pulse">Loading available flows...</p>
                            ) : flows.length > 0 ? (
                                <select
                                    value={localData.targetFlowName || ''}
                                    onChange={(e) => {
                                        const flow = flows.find(f => f.name === e.target.value);
                                        handleChanges({
                                            targetFlowName: e.target.value,
                                            targetFlowId: flow ? (flow._id || flow.id) : ''
                                        });
                                    }}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                >
                                    <option value="" disabled>Select a flow to jump to</option>
                                    {flows.map(f => (
                                        <option key={f._id || f.id || f.name} value={f.name}>{f.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={localData.targetFlowName || ''}
                                        onChange={(e) => handleChange('targetFlowName', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                        placeholder="e.g. Main Menu"
                                    />
                                    <p className="text-[10px] text-amber-600 dark:text-amber-400">No other flows found. You can type the name manually or create one first.</p>
                                </div>
                            )}
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Connecting this will seamlessly hand off the user to the starting node of the selected flow.</p>
                        </div>
                    </div>
                );

            case 'inputTextNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Question Text</label>
                            <textarea
                                value={localData.text || ''}
                                onChange={(e) => handleChange('text', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                placeholder="e.g. What is your full name?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Save answer to variable:</label>
                            <input
                                type="text"
                                value={localData.variable || ''}
                                onChange={(e) => handleChange('variable', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm font-mono"
                                placeholder="e.g. user_name"
                            />
                        </div>
                    </div>
                );

            case 'inputDateNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Question Text</label>
                            <textarea
                                value={localData.text || ''}
                                onChange={(e) => handleChange('text', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                placeholder="e.g. Select your preferred date"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Save to variable:</label>
                            <input
                                type="text"
                                value={localData.variable || ''}
                                onChange={(e) => handleChange('variable', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm font-mono"
                                placeholder="e.g. booking_date"
                            />
                        </div>
                    </div>
                );

            case 'inputNumberNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Question Text</label>
                            <textarea
                                value={localData.text || ''}
                                onChange={(e) => handleChange('text', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                placeholder="e.g. How many pax?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Save to variable:</label>
                            <input
                                type="text"
                                value={localData.variable || ''}
                                onChange={(e) => handleChange('variable', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm font-mono"
                                placeholder="e.g. headcount"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Exact Digit Length (Optional)</label>
                            <input
                                type="number"
                                min="1"
                                value={localData.exactLength || ''}
                                onChange={(e) => handleChange('exactLength', e.target.value ? parseInt(e.target.value) : '')}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                placeholder="e.g. 10 (for phone numbers)"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Leave empty to accept any numbers.</p>
                        </div>
                    </div>
                );

            case 'customFieldNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Field Name (Key)</label>
                            {isLoadingCustomFields ? (
                                <p className="text-xs text-slate-500 animate-pulse">Loading custom fields...</p>
                            ) : customFields.length > 0 ? (
                                <select
                                    value={localData.field || ''}
                                    onChange={(e) => handleChange('field', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                >
                                    <option value="" disabled>Select a custom field</option>
                                    {customFields.map(cf => (
                                        <option key={cf._id || cf.key || cf.name} value={cf.key || cf.name}>{cf.name || cf.key}</option>
                                    ))}
                                </select>
                            ) : (
                                <input type="text" value={localData.field || ''} onChange={(e) => handleChange('field', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm" placeholder="e.g. loyalty_points" />
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Operation</label>
                            <select value={localData.action || 'SET'} onChange={(e) => handleChange('action', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm">
                                <option value="SET">Set exact value</option><option value="ADD">Add to current</option><option value="SUBTRACT">Subtract from current</option>
                            </select>
                        </div>
                        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Value</label><input type="text" value={localData.value || ''} onChange={(e) => handleChange('value', e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm" /></div>
                    </div>
                );

            case 'paymentNode':
                return (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item / Product Name</label>
                            <input
                                type="text"
                                value={localData.itemName || ''}
                                onChange={(e) => handleChange('itemName', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm"
                                placeholder="e.g. Premium Subscription"
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount</label>
                                <input
                                    type="text"
                                    value={localData.amount || ''}
                                    onChange={(e) => handleChange('amount', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm font-mono"
                                    placeholder="e.g. 150.00 or {{vars.total}}"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                                <select
                                    value={localData.currency || 'INR'}
                                    onChange={(e) => handleChange('currency', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none text-sm uppercase"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="AED">AED (د.إ)</option>
                                    <option value="CAD">CAD ($)</option>
                                    <option value="AUD">AUD ($)</option>
                                    <option value="SGD">SGD ($)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Link (Stripe, Razorpay, etc.)</label>
                            <input
                                type="url"
                                value={localData.paymentLink || ''}
                                onChange={(e) => handleChange('paymentLink', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                placeholder="https://buy.stripe.com/..."
                            />
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700 opacity-60">
                            <label className="flex items-center gap-2 cursor-not-allowed">
                                <input
                                    type="checkbox"
                                    disabled
                                    checked={false}
                                    className="rounded border-slate-300 text-slate-400 focus:ring-slate-500 cursor-not-allowed"
                                />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Wait for Payment Completion <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded ml-1 font-bold">COMING SOON</span></span>
                            </label>
                            <p className="text-[10px] text-slate-500 mt-1 italic">Automatic resumption requires webhook integration with Stripe/Razorpay.</p>
                        </div>
                    </div>
                );

            default:
                return <p className="text-sm text-slate-500">Configuration not available for this node type.</p>;
        }
    };

    return (
        <>
            {/* Mobile Backdrop */}
            <div className="md:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose} />
            
            <aside className="fixed md:absolute bottom-0 md:bottom-auto left-0 md:left-auto md:right-0 w-full md:w-80 h-[85vh] md:h-full bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-xl z-50 rounded-t-3xl md:rounded-none animate-in slide-in-from-bottom-full md:slide-in-from-right-full duration-300">
                {/* Mobile Drag Handle Indicator */}
                <div className="md:hidden w-full flex justify-center pt-3 pb-1 flex-shrink-0" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer hover:bg-slate-300 transition-colors" />
                </div>
                
                <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800/50 flex-shrink-0">
                    <h3 className="font-semibold text-slate-800 dark:text-white capitalize">
                        {node.type.replace('Node', '')} Settings
                    </h3>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
                {renderConfigFields()}
            </div>
            {/* Delete Button — hidden for Trigger nodes */}
            {node.type !== 'triggerNode' && onDelete && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/50">
                    <button
                        onClick={onDelete}
                        className="w-full py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete This Node
                    </button>
                </div>
            )}
        </aside>
        <MediaPickerModal
            isOpen={mediaPickerOpen}
            onClose={() => setMediaPickerOpen(false)}
            onSelect={handleMediaManagerSelect}
            allowedTypes={
                localData.mediaType === 'image' ? 'image' :
                localData.mediaType === 'video' ? 'video' :
                localData.mediaType === 'document' ? 'document' :
                'all'
            }
            mimeConstraints={
                localData.mediaType === 'image' ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] :
                localData.mediaType === 'video' ? ['video/mp4', 'video/webm', 'video/3gpp'] :
                localData.mediaType === 'document' ? ['application/pdf', 'text/csv', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] :
                localData.mediaType === 'audio' ? ['audio/mpeg', 'audio/ogg', 'audio/wav'] :
                null
            }
            title={`Pick ${localData.mediaType || 'Media'} from Library`}
            multiple={false}
        />
        </>
    );
};

export default FlowConfigurator;
