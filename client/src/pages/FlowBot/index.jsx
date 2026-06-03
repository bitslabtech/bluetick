import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2, Lock, Unlock, Plus, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

import FlowCanvas from './FlowCanvas';
import FlowSidebar from './FlowSidebar';
import FlowConfigurator from './FlowConfigurator';
import MobileNodePicker from './MobileNodePicker';
import FlowList from './FlowList';
import { useAuth } from '../../context/AuthContext';

const defaultTriggerNode = {
    id: 'trigger-1',
    type: 'triggerNode',
    position: { x: 250, y: 50 },
    data: { keyword: 'START', isAny: true },
};

let idCounter = 1;
const getId = () => `node_${Date.now()}_${idCounter++}`;

const API = import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL}`;

const FlowBotBuilder = () => {
    const { token } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const reactFlowWrapper = useRef(null);
    const initialLoadDone = useRef(false);

    const [nodes, setNodes] = useState([defaultTriggerNode]);
    const [edges, setEdges] = useState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);

    // Flow management
    const [activeFlowId, setActiveFlowId] = useState(id || null);
    const [flowName, setFlowName] = useState('Untitled Flow');
    const [flowStatus, setFlowStatus] = useState('draft');
    const [saving, setSaving] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    // Unsaved Changes
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showExitWarning, setShowExitWarning] = useState(false);
    const [showMobilePicker, setShowMobilePicker] = useState(false);

    useEffect(() => {
        if (id) {
            loadFlow(id);
        } else {
            // New flow
            initialLoadDone.current = false;
            setNodes([{ ...defaultTriggerNode }]);
            setEdges([]);
            setActiveFlowId(null);
            setFlowName('Untitled Flow');
            setFlowStatus('draft');
            setSelectedNode(null);
            setIsLocked(false);
            setHasUnsavedChanges(false);
            setTimeout(() => { initialLoadDone.current = true; }, 100);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        if (initialLoadDone.current) {
            setHasUnsavedChanges(true);
        }
    }, [nodes, edges, flowName]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const goBackToList = () => {
        if (hasUnsavedChanges) {
            setShowExitWarning(true);
        } else {
            navigate('/flowbot');
        }
    };

    const loadFlow = async (flowId) => {
        try {
            initialLoadDone.current = false;
            const res = await axios.get(`${API}/api/flows/${flowId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const flow = res.data;
            setNodes(flow.nodes || [defaultTriggerNode]);
            setEdges(flow.edges || []);
            setFlowName(flow.name);
            setActiveFlowId(flow.id);
            setFlowStatus(flow.isActive ? 'published' : 'draft');
            setSelectedNode(null);
            setIsLocked(flow.isActive);
            setHasUnsavedChanges(false);
            setTimeout(() => { initialLoadDone.current = true; }, 100);
        } catch (err) {
            toast.error('Failed to load flow');
        }
    };

    const saveFlow = async (publish = false) => {
        setSaving(true);
        try {
            const triggerNode = nodes.find(n => n.type === 'triggerNode');

            const payload = {
                name: flowName,
                triggerKeyword: triggerNode?.data?.keyword?.toLowerCase() || null,
                isAny: triggerNode?.data?.isAny || false,
                nodes,
                edges,
                isActive: publish
            };

            let res;
            if (activeFlowId) {
                res = await axios.put(`${API}/api/flows/${activeFlowId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                res = await axios.post(`${API}/api/flows`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setActiveFlowId(res.data.id);
            }

            setFlowStatus(publish ? 'published' : 'draft');
            setHasUnsavedChanges(false);
            toast.success(publish ? '🚀 Flow published!' : '💾 Flow saved as draft');

            // If it was a new flow, rewrite URL so a refresh keeps them in edit mode
            if (!activeFlowId && res?.data?.id) {
                navigate(`/flowbot/edit/${res.data.id}`, { replace: true });
            }
        } catch (err) {
            toast.error('Failed to save flow');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const autoPlaceNode = useCallback((type, label) => {
        if (isLocked) {
            toast('Board is locked! Please unlock to make changes.', { icon: '🔒' });
            return;
        }

        // Calculate position based on the last selected node, or default to a center-ish position
        let position = { x: 250, y: 150 };
        if (selectedNode) {
            position = {
                x: selectedNode.position.x,
                y: selectedNode.position.y + 120 // Place below the selected node
            };
        } else if (nodes.length > 0) {
            const lastNode = nodes[nodes.length - 1];
            position = {
                x: lastNode.position.x,
                y: lastNode.position.y + 120
            };
        }

        let newNodeData = { label: `${type} node` };

        if (type === 'messageNode') newNodeData = { text: 'Type your message here...' };
        if (type === 'interactiveNode') newNodeData = { text: 'Ask a question...', buttons: ['Yes', 'No'] };
        if (type === 'listNode') newNodeData = { title: 'Select an option', sections: [{ rows: ['Option 1', 'Option 2'] }] };
        if (type === 'mediaNode') newNodeData = { mediaType: 'image', mediaUrl: '' };
        if (type === 'templateNode') newNodeData = { templateName: '' };
        if (type === 'locationNode') newNodeData = { text: 'Please share your location' };
        if (type === 'conditionNode') newNodeData = { variable: 'status', operator: '==', value: 'active' };
        if (type === 'splitNode') newNodeData = { splitRatio: 50 };
        if (type === 'jumpNode') newNodeData = { targetFlowId: '', targetFlowName: '' };
        if (type === 'delayNode') newNodeData = { delayValue: 5, delayUnit: 'minutes' };
        if (type === 'inputTextNode') newNodeData = { text: 'Please enter your name:', variable: 'user_name' };
        if (type === 'inputDateNode') newNodeData = { text: 'When would you like to book?', format: 'DD/MM/YYYY', variable: 'booking_date' };
        if (type === 'inputNumberNode') newNodeData = { text: 'What is your assigned ID?', variable: 'user_id' };
        if (type === 'actionNode') newNodeData = { action: 'Add Tag / Set Variable' };
        if (type === 'customFieldNode') newNodeData = { field: '', action: 'SET', value: '' };
        if (type === 'webhookNode') newNodeData = { url: '', method: 'GET', headers: '{}', body: '{}' };
        if (type === 'notifyNode') newNodeData = { emails: '', message: 'Hot lead waiting in WhatsApp!' };
        if (type === 'paymentNode') newNodeData = { itemName: 'Product', amount: '10.00', currency: 'INR' };
        if (type === 'aiNode') newNodeData = { prompt: 'You are a helpful assistant. Reply concisely.' };
        if (type === 'handoffNode') newNodeData = { message: 'Pause bot & assign to agent' };

        const newNode = {
            id: getId(),
            type,
            position,
            data: newNodeData,
        };

        setNodes((nds) => [...nds, newNode]);
        setShowMobilePicker(false);
        toast.success(`Added ${label}`);

        // Auto-select the newly created node so the next one places below it
        setTimeout(() => {
            setSelectedNode(newNode);
        }, 50);

    }, [nodes, selectedNode, isLocked]);

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            if (typeof type === 'undefined' || !type) {
                return;
            }

            if (isLocked) {
                toast('Board is locked! Please unlock to make changes.', { icon: '🔒' });
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            let newNodeData = { label: `${type} node` };

            if (type === 'messageNode') newNodeData = { text: 'Type your message here...' };
            if (type === 'interactiveNode') newNodeData = { text: 'Ask a question...', buttons: ['Yes', 'No'] };
            // -- Messaging & Media --
            if (type === 'listNode') newNodeData = { title: 'Select an option', sections: [{ rows: ['Option 1', 'Option 2'] }] };
            if (type === 'mediaNode') newNodeData = { mediaType: 'image', mediaUrl: '' };
            if (type === 'templateNode') newNodeData = { templateName: '' };
            if (type === 'locationNode') newNodeData = { text: 'Please share your location' };
            // -- Logic & Flow --
            if (type === 'conditionNode') newNodeData = { variable: 'status', operator: '==', value: 'active' };
            if (type === 'splitNode') newNodeData = { splitRatio: 50 };
            if (type === 'jumpNode') newNodeData = { targetFlowId: '', targetFlowName: '' };
            if (type === 'delayNode') newNodeData = { delayValue: 5, delayUnit: 'minutes' };
            // -- Data Collection --
            if (type === 'inputTextNode') newNodeData = { text: 'Please enter your name:', variable: 'user_name' };
            if (type === 'inputDateNode') newNodeData = { text: 'When would you like to book?', format: 'DD/MM/YYYY', variable: 'booking_date' };
            if (type === 'inputNumberNode') newNodeData = { text: 'What is your assigned ID?', variable: 'user_id' };
            // -- Actions & Integrations --
            if (type === 'actionNode') newNodeData = { action: 'Add Tag / Set Variable' };
            if (type === 'customFieldNode') newNodeData = { field: '', action: 'SET', value: '' };
            if (type === 'webhookNode') newNodeData = { url: '', method: 'GET', headers: '{}', body: '{}' };
            if (type === 'notifyNode') newNodeData = { emails: '', message: 'Hot lead waiting in WhatsApp!' };
            if (type === 'paymentNode') newNodeData = { itemName: 'Product', amount: '10.00', currency: 'INR' };
            if (type === 'aiNode') newNodeData = { prompt: 'You are a helpful assistant. Reply concisely.' };
            if (type === 'handoffNode') newNodeData = { message: 'Pause bot & assign to agent' };

            const newNode = {
                id: getId(),
                type,
                position,
                data: newNodeData,
            };

            setNodes((nds) => [...nds, newNode]);
        },
        [reactFlowInstance, isLocked],
    );

    // Immutably update node data
    const updateNodeData = useCallback((nodeId, newData) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, ...newData } };
                }
                return node;
            })
        );
        setSelectedNode((prev) => {
            if (prev && prev.id === nodeId) {
                return { ...prev, data: { ...prev.data, ...newData } };
            }
            return prev;
        });
    }, []);

    // Delete specific node
    const handleDeleteNode = useCallback((nodeId) => {
        if (isLocked) {
            toast('Board is locked! Please unlock to delete nodes.', { icon: '🔒' });
            return;
        }
        if (nodeId.startsWith('trigger-')) {
            toast.error("Can't delete the Trigger node");
            return;
        }
        setNodes((nds) => nds.filter(n => n.id !== nodeId));
        setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
        setSelectedNode(prev => prev?.id === nodeId ? null : prev);
        toast.success('Node deleted');
    }, [isLocked]);

    // Edit specific node
    const handleEditNode = useCallback((nodeId) => {
        if (isLocked) {
            toast('Board is locked! Please unlock to edit nodes.', { icon: '🔒' });
            return;
        }
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setSelectedNode(node);
        }
    }, [nodes, isLocked]);

    // Delete selected node (from configurator panel)
    const deleteSelectedNode = useCallback(() => {
        if (!selectedNode) return;
        handleDeleteNode(selectedNode.id);
    }, [selectedNode, handleDeleteNode]);

    // Attach actions to nodes whenever nodes change so the toolbar works
    const nodesWithActions = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                onEdit: () => handleEditNode(node.id),
                onDelete: () => handleDeleteNode(node.id)
            }
        }));
    }, [nodes, handleEditNode, handleDeleteNode, isLocked]);

    // Removed legacy internal view toggle

    // Builder View
    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-2 sm:px-4 z-10 shadow-sm gap-2 sm:gap-4 overflow-x-auto hide-scrollbar">
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <button
                        onClick={goBackToList}
                        className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Back to Flows"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                    <h1 className="hidden sm:flex text-base font-bold text-slate-800 dark:text-white items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-sm">🤖</span>
                        BlueTick
                    </h1>
                    <input
                        type="text"
                        value={flowName}
                        onChange={(e) => setFlowName(e.target.value)}
                        className="px-2 sm:px-3 py-1 text-sm font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 w-24 sm:w-48"
                        placeholder="Flow name..."
                    />
                    <span className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-medium rounded-full border ${flowStatus === 'published'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        }`}>
                        {flowStatus === 'published' ? '● Live' : 'Draft'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    <button
                        onClick={() => setIsLocked(!isLocked)}
                        className={`hidden sm:flex p-1.5 sm:p-2 rounded-lg transition-colors border shadow-sm items-center justify-center gap-1 text-sm font-medium ${isLocked
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                            }`}
                        title={isLocked ? "Unlock Board" : "Lock Board"}
                    >
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                    <button
                        onClick={() => saveFlow(false)}
                        disabled={saving}
                        className="hidden sm:block px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                    >
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button
                        onClick={() => saveFlow(true)}
                        disabled={saving}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors whitespace-nowrap"
                    >
                        {saving ? 'Publishing...' : 'Save & Publish'}
                    </button>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                <ReactFlowProvider>
                    {/* Left Sidebar */}
                    <FlowSidebar />

                    {/* Canvas Area */}
                    <div className="flex-1 relative pb-14 md:pb-0" ref={reactFlowWrapper}>
                        <FlowCanvas
                            nodes={nodesWithActions}
                            edges={edges}
                            setNodes={setNodes}
                            setEdges={setEdges}
                            onInit={setReactFlowInstance}
                            onDrop={onDrop}
                            onDragOver={onDragOver}
                            setSelectedNode={setSelectedNode}
                            isLocked={isLocked}
                        />
                    </div>

                    {/* Right Panel Configurator */}
                    {selectedNode && (
                        <FlowConfigurator
                            node={selectedNode}
                            updateNodeData={updateNodeData}
                            onClose={() => setSelectedNode(null)}
                            onDelete={deleteSelectedNode}
                        />
                    )}
                </ReactFlowProvider>
            </div>

            {/* Mobile Bottom Sticky Bar */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-30 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex h-14">
                    {/* Left Side: Controls */}
                    <div className="flex-1 flex items-center justify-around px-2 border-r border-slate-200 dark:border-slate-800">
                        <button onClick={() => reactFlowInstance?.zoomIn()} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg active:scale-95 transition-transform">
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button onClick={() => reactFlowInstance?.zoomOut()} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg active:scale-95 transition-transform">
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <button onClick={() => reactFlowInstance?.fitView({ duration: 300 })} className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg active:scale-95 transition-transform">
                            <Maximize className="w-5 h-5" />
                        </button>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                        <button onClick={() => setIsLocked(!isLocked)} className={`p-2 rounded-lg active:scale-95 transition-transform ${isLocked ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            {isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                        </button>
                    </div>
                    {/* Right Side: Add Module */}
                    <button
                        onClick={() => setShowMobilePicker(true)}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors active:bg-indigo-800"
                    >
                        <Plus className="w-5 h-5" />
                        Add Module
                    </button>
                </div>
            </div>

            <MobileNodePicker
                isOpen={showMobilePicker}
                onClose={() => setShowMobilePicker(false)}
                onSelectNode={autoPlaceNode}
            />
            {showExitWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unsaved Changes</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">You have unsaved changes. Do you want to save before leaving?</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={async () => { await saveFlow(false); setShowExitWarning(false); navigate('/flowbot'); }} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                                Save & Leave
                            </button>
                            <button onClick={() => { setShowExitWarning(false); navigate('/flowbot'); }} className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:text-red-400 font-medium rounded-lg transition-colors">
                                Leave without saving
                            </button>
                            <button onClick={() => setShowExitWarning(false)} className="w-full py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 font-medium rounded-lg transition-colors">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FlowBotBuilder;
