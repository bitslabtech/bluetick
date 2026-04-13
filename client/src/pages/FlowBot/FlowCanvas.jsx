import React, { useCallback, useMemo } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    Handle,
    Position,
    MarkerType
} from '@xyflow/react';
import { Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ── SHARED COMPONENTS ──
const NodeToolbar = ({ onEdit, onDelete, showDelete = true }) => (
    <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
        <button 
            onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            className="p-1.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 transition-colors"
            title="Edit Node"
        >
            <Edit2 className="w-4 h-4" />
        </button>
        {showDelete && (
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
                className="p-1.5 bg-white dark:bg-slate-800 text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 transition-colors"
                title="Delete Node"
            >
                <Trash2 className="w-4 h-4" />
            </button>
        )}
    </div>
);

// ── CUSTOM NODES ──
const BaseNode = ({ id, data, title, icon, color, description, children, noTarget, noSource }) => (
    <div className={`w-72 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-white/10 overflow-visible relative group hover:border-${color}-400 transition-colors`}>
        <div className={`h-1.5 bg-${color}-500 w-full rounded-t-xl`} />
        {!noTarget && <Handle type="target" position={Position.Left} className={`!w-3.5 !h-3.5 !bg-${color}-500 !border-2 !border-white dark:!border-slate-300 !shadow-md !shadow-${color}-500/30`} />}
        <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
                <span className={`w-6 h-6 rounded-md bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 flex items-center justify-center text-xs`}>{icon}</span>
                <span className="font-semibold text-slate-800 dark:text-white text-sm">{title}</span>
            </div>
            {description && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{description}</p>}
            {children}
        </div>
        {!noSource && <Handle type="source" position={Position.Right} className={`!w-3.5 !h-3.5 !bg-${color}-500 !border-2 !border-white dark:!border-slate-300 !shadow-md !shadow-${color}-500/30`} />}
        <NodeToolbar onEdit={data.onEdit} onDelete={data.onDelete} showDelete={!noTarget} />
    </div>
);

// existing triggers
const TriggerNode = ({ data }) => (
    <BaseNode data={data} title="Trigger" icon="⚡" color="indigo" description={data.isAny ? 'Responds to any message' : `Keyword: "${data.keyword || ''}"`} noTarget tooltip="Starts the flow when a user sends this keyword.">
        <div className="hidden" />
    </BaseNode>
);

const MessageNode = ({ data }) => (
    <BaseNode data={data} title="Send Message" icon="💬" color="blue" tooltip="Sends a plain text message to the user.">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-white/5">
            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">{data.text || 'Empty message...'}</p>
        </div>
    </BaseNode>
);

const InteractiveNode = ({ data }) => (
    <BaseNode data={data} title="Buttons" icon="🔘" color="purple" tooltip="Sends a message with up to 3 clickable buttons. Each button can route differently." noSource>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-white/5 mb-3">
            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{data.text || 'Empty question...'}</p>
        </div>
        <div className="space-y-2">
            {(data.buttons || []).map((btn, index) => (
                <div key={index} className="relative">
                    <div className="w-full text-center py-1.5 px-3 bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium">{btn}</div>
                    <Handle type="source" id={`btn-${index}`} position={Position.Right} className="!w-3 !h-3 !bg-purple-500 !border-2 !border-white dark:!border-slate-800" style={{ top: '50%', right: '-6px', transform: 'translateY(-50%)' }} />
                </div>
            ))}
        </div>
    </BaseNode>
);

// --- NEW NODES ---

const ListNode = ({ data }) => (
    <BaseNode data={data} title="Interactive List" icon="📋" color="indigo" tooltip="Sends a list menu with up to 10 options divided into sections." noSource>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-white/5 mb-3">
            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 font-medium mb-1">{data.title || 'Select an option'}</p>
        </div>
        <div className="space-y-1.5">
            {(data.sections || [{rows: ['Option 1']}]).map((sec, sIdx) => {
                // If there are multiple sections, creating unique keys for the handles
                const offset = sIdx * 10;
                return sec.rows.map((row, rIdx) => {
                    const handleId = `row-${offset + rIdx}`;
                    return (
                        <div key={handleId} className="relative">
                            <div className="text-xs py-1.5 px-3 bg-white dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg font-medium pr-6 truncate">
                                {row}
                            </div>
                            <Handle type="source" id={handleId} position={Position.Right} className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white dark:!border-slate-800" style={{ top: '50%', right: '-6px', transform: 'translateY(-50%)' }} />
                        </div>
                    );
                });
            })}
        </div>
    </BaseNode>
);

const MediaNode = ({ data }) => (
    <BaseNode data={data} title="Media/Document" icon="🖼️" color="sky" tooltip="Sends an image, video, document, or audio file.">
        <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
            {data.mediaUrl ? (
                <div className="relative group/preview">
                    {(data.mediaType === 'video') ? (
                        <div className="aspect-video bg-black flex items-center justify-center relative">
                            <video src={data.mediaUrl} className="w-full h-full object-cover opacity-80" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-white text-2xl drop-shadow-md">🎬</span>
                            </div>
                        </div>
                    ) : (!data.mediaType || data.mediaType === 'image') ? (
                        <img src={data.mediaUrl} alt="Preview" className="w-full aspect-video object-cover" />
                    ) : (
                        <div className="p-4 flex flex-col items-center justify-center gap-2">
                            <span className="text-2xl">{data.mediaType === 'audio' ? '🎵' : '📄'}</span>
                            <p className="text-[10px] text-slate-500 truncate w-full text-center px-2">{data.originalName || 'File Selected'}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                    <span className="text-xl mb-1 text-slate-400">📷</span>
                    <p className="text-[10px] text-slate-400">No media selected</p>
                </div>
            )}
        </div>
    </BaseNode>
);

const TemplateNode = ({ data }) => (
    <BaseNode data={data} title="Template Message" icon="📑" color="fuchsia" tooltip="Sends a pre-approved WhatsApp template. Useful for returning after 24h.">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-white/5">
            <p className="text-sm font-mono text-fuchsia-600 dark:text-fuchsia-400">{data.templateName || 'select_template'}</p>
        </div>
    </BaseNode>
);

const LocationNode = ({ data }) => (
    <BaseNode data={data} title="Request Location" icon="📍" color="orange" tooltip="Asks the user to share their location pin.">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-100 dark:border-white/5">
            <p className="text-sm text-slate-700 dark:text-slate-300">{data.text || 'Please share your location'}</p>
        </div>
    </BaseNode>
);

const ConditionNode = ({ data }) => (
    <BaseNode data={data} title="Condition (If/Else)" icon="🔀" color="violet" noSource tooltip="Checks a variable and splits the flow.">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 dark:border-white/5 mb-3 flex items-center justify-between text-xs font-mono">
            <span className="text-violet-600">{data.variable || 'variable'}</span>
            <span className="text-slate-400">{data.operator || '=='}</span>
            <span className="text-slate-700 dark:text-slate-300">{data.value || 'value'}</span>
        </div>
        <div className="flex justify-between relative mt-4 h-6">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold">True</div>
            <Handle type="source" id="true" position={Position.Right} className="!w-3 !h-3 !bg-green-500" style={{ right: 'auto', left: '40px', top: '50%' }} />
            
            <div className="absolute right-8 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-bold">False</div>
            <Handle type="source" id="false" position={Position.Right} className="!w-3 !h-3 !bg-red-500" style={{ top: '50%', right: '0' }} />
        </div>
    </BaseNode>
);

const SplitNode = ({ data }) => {
    const ratioA = data.splitRatio || 50;
    const ratioB = 100 - ratioA;
    return (
        <BaseNode data={data} title="A/B Split" icon="✂️" color="pink" noSource tooltip="Randomly divides users down two different paths to test which works best.">
            <div className="flex justify-around items-center border-t border-slate-100 dark:border-white/10 pt-3 relative">
                <div className="text-center relative pb-3 w-1/2">
                    <p className="text-xs font-bold text-pink-600 dark:text-pink-400">{ratioA}%</p>
                    <p className="text-[10px] text-slate-400 uppercase">Path A</p>
                    <Handle type="source" id="a" position={Position.Bottom} className="!w-3 !h-3 !bg-pink-500 absolute" style={{ bottom: '-18px', left: '50%', transform: 'translateX(-50%)' }} />
                </div>
                <div className="w-px h-8 bg-slate-100 dark:bg-white/10"></div>
                <div className="text-center relative pb-3 w-1/2">
                    <p className="text-xs font-bold text-pink-600 dark:text-pink-400">{ratioB}%</p>
                    <p className="text-[10px] text-slate-400 uppercase">Path B</p>
                    <Handle type="source" id="b" position={Position.Bottom} className="!w-3 !h-3 !bg-pink-500 absolute" style={{ bottom: '-18px', left: '50%', transform: 'translateX(-50%)' }} />
                </div>
            </div>
        </BaseNode>
    );
};

const JumpNode = ({ data }) => (
    <BaseNode data={data} title="Jump To" icon="🔁" color="teal" noSource tooltip="Jumps to a completely different flow or node without connecting a line.">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 text-center">
            <p className="text-xs font-medium text-teal-600">Target: {data.targetFlowName || 'Select Flow'}</p>
        </div>
    </BaseNode>
);

const InputTextNode = ({ data }) => (
    <BaseNode data={data} title="Wait for Text" icon="⌨️" color="cyan" tooltip="Waits for the user to type a reply and saves it to a variable.">
        <div className="mb-2">
            <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{data.text || 'Ask a question...'}</p>
        </div>
        <div className="bg-cyan-50 dark:bg-cyan-900/20 py-1 px-2 rounded text-xs text-cyan-700 dark:text-cyan-400 border border-cyan-100 flex justify-between">
            <span>Save to:</span>
            <span className="font-mono font-bold">{data.variable || 'user_input'}</span>
        </div>
    </BaseNode>
);

const InputDateNode = ({ data }) => (
    <BaseNode data={data} title="Wait for Date" icon="📅" color="blue" tooltip="Waits for a valid date/time input from the user.">
        <div className="mb-2"><p className="text-sm line-clamp-2">{data.text || 'When would you like to book?'}</p></div>
        <div className="bg-blue-50 py-1 px-2 rounded text-xs text-blue-700 font-mono">Format: {data.format || 'DD/MM/YYYY'}</div>
    </BaseNode>
);

const InputNumberNode = ({ data }) => (
    <BaseNode data={data} title="Wait for Number" icon="🔢" color="indigo" tooltip="Ensures the user replies with a valid number (e.g., Age, Order ID).">
        <div className="mb-2"><p className="text-sm line-clamp-2">{data.text || 'What is your assigned ID?'}</p></div>
        <div className="bg-indigo-50 py-1 px-2 rounded text-xs text-indigo-700 font-mono font-bold">Save to: {data.variable || 'number_input'}</div>
    </BaseNode>
);

const WebhookNode = ({ data }) => (
    <BaseNode data={data} title="API / Webhook" icon="🌐" color="gray" tooltip="Makes an HTTP request to an external server.">
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 rounded p-2">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${data.method === 'POST' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{data.method || 'GET'}</span>
            <span className="text-xs font-mono text-slate-500 truncate">{data.url || 'https://api.example.com/v1'}</span>
        </div>
    </BaseNode>
);

const CustomFieldNode = ({ data }) => (
    <BaseNode data={data} title="Update Field" icon="💾" color="yellow" tooltip="Silently updates a custom CRM field for the contact in the database.">
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 border border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-yellow-700">{data.field || 'field_name'}</span>
            <span className="text-[10px] px-1 bg-white border rounded text-slate-500">{data.action || 'SET'}</span>
            <span className="text-xs font-mono truncate w-16 text-right">{data.value || 'value'}</span>
        </div>
    </BaseNode>
);

const NotifyNode = ({ data }) => (
    <BaseNode data={data} title="Notify Team" icon="🔔" color="red" tooltip="Sends an internal email or dashboard notification to your team.">
        <p className="text-xs text-slate-500 font-medium whitespace-nowrap overflow-hidden text-overflow-ellipsis">To: {data.emails || 'admin@example.com'}</p>
    </BaseNode>
);

const PaymentNode = ({ data }) => {
    const currencySymbols = {
        'INR': '₹',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'AED': 'د.إ',
        'CAD': '$',
        'AUD': '$',
        'SGD': '$'
    };
    const symbol = currencySymbols[data.currency] || data.currency || '₹';
    
    return (
        <BaseNode data={data} title="Payment Link" icon="💳" color="green" tooltip="Generates and sends an invoice/payment link inside the chat.">
            <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 rounded p-2 border border-green-100 dark:border-green-800/50">
                <span className="text-xs font-medium text-green-800 dark:text-green-300">{data.itemName || 'Product'}</span>
                <span className="text-sm font-bold text-green-700 dark:text-green-400">{symbol}{data.amount || '0.00'}</span>
            </div>
        </BaseNode>
    );
};

const AINode = ({ data }) => (
    <BaseNode data={data} title="AI Reply" icon="🤖" color="violet" tooltip="Sends the user's message to an LLM to generate a smart reply based on a prompt.">
        <p className="text-xs text-slate-500 italic line-clamp-2 border-l-2 border-violet-300 pl-2">{data.prompt || 'You are a helpful assistant...'}</p>
    </BaseNode>
);

// existing simple nodes rewritten to BaseNode
const DelayNode = ({ data }) => (
    <BaseNode data={data} title="Wait" icon="⏳" color="amber" tooltip="Pauses the flow for a specific duration before moving to the next block.">
        <div className="flex items-center justify-between">
            <span className="text-sm font-mono text-amber-600 dark:text-amber-400 font-medium">{data.delayValue || 5} {data.delayUnit || 'minutes'}</span>
        </div>
    </BaseNode>
);

const ActionNode = ({ data }) => (
    <BaseNode data={data} title="Action" icon="⚙️" color="emerald" tooltip="Adds or removes system tags from the user.">
        <p className="text-xs text-slate-500 dark:text-slate-400">{data.action || 'Add Tag / Set Variable'}</p>
    </BaseNode>
);

const HandoffNode = ({ data }) => (
    <BaseNode data={data} title="Human Handoff" icon="🙋" color="rose" noSource tooltip="Pauses the automation and flags the chat for a human agent.">
        <p className="text-xs text-slate-500 dark:text-slate-400">{data.message || 'Pause bot & assign to agent'}</p>
    </BaseNode>
);

// ── CANVAS COMPONENT ──
const FlowCanvas = ({ nodes, edges, setNodes, setEdges, onInit, onDrop, onDragOver, setSelectedNode, isLocked }) => {
    const nodeTypes = useMemo(() => ({
        triggerNode: TriggerNode,
        messageNode: MessageNode,
        interactiveNode: InteractiveNode,
        listNode: ListNode,
        mediaNode: MediaNode,
        templateNode: TemplateNode,
        locationNode: LocationNode,
        conditionNode: ConditionNode,
        splitNode: SplitNode,
        jumpNode: JumpNode,
        inputTextNode: InputTextNode,
        inputDateNode: InputDateNode,
        inputNumberNode: InputNumberNode,
        webhookNode: WebhookNode,
        customFieldNode: CustomFieldNode,
        notifyNode: NotifyNode,
        paymentNode: PaymentNode,
        aiNode: AINode,
        delayNode: DelayNode,
        actionNode: ActionNode,
        handoffNode: HandoffNode
    }), []);

    const onNodesChange = useCallback(
        (changes) => {
            if (isLocked) return;
            setNodes((nds) => applyNodeChanges(changes, nds));
        },
        [setNodes, isLocked]
    );

    const onEdgesChange = useCallback(
        (changes) => {
            if (isLocked) return;
            setEdges((eds) => applyEdgeChanges(changes, eds));
        },
        [setEdges, isLocked]
    );

    const onConnect = useCallback(
        (params) => {
            if (isLocked) {
                toast('Board is locked! Please unlock to connect nodes.', { icon: '🔒', id: 'lockAlert' });
                return;
            }
            setEdges((eds) => addEdge({
                ...params,
                animated: true,
                style: { stroke: '#6366f1', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
            }, eds));
        },
        [setEdges, isLocked]
    );

    const onNodeClick = useCallback((event, node) => {
        if (isLocked) {
            toast('Board is locked! Please unlock to edit nodes.', { icon: '🔒', id: 'lockAlert' });
            return;
        }
        setSelectedNode(node);
    }, [setSelectedNode, isLocked]);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, [setSelectedNode]);

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={onInit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitViewOptions={{ maxZoom: 0.7, padding: 0.2 }}
            className="bg-slate-50 dark:bg-slate-900"
            defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
            showAttribution={false}
            nodesDraggable={!isLocked}
            nodesConnectable={!isLocked}
            elementsSelectable={!isLocked}
        >
            <Background color="#94a3b8" gap={20} size={1.5} />
            <Controls 
                position="bottom-left"
                style={{ bottom: 40, left: 20, margin: 0 }}
                className="fill-slate-500 dark:fill-slate-400 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md !m-0" 
            />
            <MiniMap 
                position="bottom-right"
                style={{ bottom: 40, right: 20, margin: 0 }}
                nodeStrokeColor="#cbd5e1"
                nodeColor={(node) => {
                    if (node.type === 'triggerNode') return '#818cf8';
                    if (node.type === 'messageNode') return '#60a5fa';
                    if (node.type === 'interactiveNode') return '#c084fc';
                    if (node.type === 'delayNode') return '#fbbf24';
                    if (node.type === 'actionNode') return '#34d399';
                    if (node.type === 'handoffNode') return '#fb7185';
                    return '#e2e8f0';
                }}
                maskColor="rgba(15, 23, 42, 0.1)"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md !m-0"
            />
        </ReactFlow>
    );
};

export default FlowCanvas;
