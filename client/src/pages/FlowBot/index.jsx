import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Trash2, Lock, Unlock } from 'lucide-react';

import FlowCanvas from './FlowCanvas';
import FlowSidebar from './FlowSidebar';
import FlowConfigurator from './FlowConfigurator';
import FlowList from './FlowList';

const defaultTriggerNode = {
    id: 'trigger-1',
    type: 'triggerNode',
    position: { x: 250, y: 50 },
    data: { keyword: 'START', isAny: true },
};

let idCounter = 1;
const getId = () => `node_${Date.now()}_${idCounter++}`;

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

const FlowBotBuilder = () => {
    const reactFlowWrapper = useRef(null);
    const [nodes, setNodes] = useState([defaultTriggerNode]);
    const [edges, setEdges] = useState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    
    // View mode: 'list' or 'builder'
    const [view, setView] = useState('list');
    
    // Flow management
    const [activeFlowId, setActiveFlowId] = useState(null);
    const [flowName, setFlowName] = useState('Untitled Flow');
    const [flowStatus, setFlowStatus] = useState('draft');
    const [saving, setSaving] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    const openBuilder = (flowId = null) => {
        if (flowId) {
            loadFlow(flowId);
        } else {
            // New flow
            setNodes([{ ...defaultTriggerNode }]);
            setEdges([]);
            setActiveFlowId(null);
            setFlowName('Untitled Flow');
            setFlowStatus('draft');
            setSelectedNode(null);
            setIsLocked(false);
        }
        setView('builder');
    };

    const goBackToList = () => {
        setView('list');
        setSelectedNode(null);
    };

    const loadFlow = async (flowId) => {
        try {
            const token = localStorage.getItem('token');
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
            setIsLocked(flow.isActive); // Auto-lock published flows
        } catch (err) {
            toast.error('Failed to load flow');
        }
    };

    const saveFlow = async (publish = false) => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
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
            toast.success(publish ? '🚀 Flow published!' : '💾 Flow saved as draft');
        } catch (err) {
            toast.error('Failed to save flow');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

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

    // If we're in list view, show the dashboard
    if (view === 'list') {
        return <FlowList onEditFlow={(id) => openBuilder(id)} onCreateNew={() => openBuilder(null)} />;
    }

    // Builder View
    return (
        <div className="h-full w-full flex flex-col bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={goBackToList}
                        className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Back to Flows"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700" />
                    <h1 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center text-white text-sm">🤖</span>
                        FlowBot
                    </h1>
                    <input 
                        type="text"
                        value={flowName}
                        onChange={(e) => setFlowName(e.target.value)}
                        className="px-3 py-1 text-sm font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                        placeholder="Flow name..."
                    />
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                        flowStatus === 'published' 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                    }`}>
                        {flowStatus === 'published' ? '● Live' : 'Draft'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsLocked(!isLocked)}
                        className={`p-2 rounded-lg transition-colors border shadow-sm flex items-center justify-center gap-1 text-sm font-medium ${
                            isLocked 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400' 
                                : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                        title={isLocked ? "Unlock Board" : "Lock Board"}
                    >
                        {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        {isLocked ? 'Locked' : 'Unlocked'}
                    </button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
                    <button 
                        onClick={() => saveFlow(false)}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                    >
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                    <button 
                        onClick={() => saveFlow(true)}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
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
                    <div className="flex-1 relative" ref={reactFlowWrapper}>
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
        </div>
    );
};

export default FlowBotBuilder;
