import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Terminal, Cable, Cpu, Server, Monitor, Trash2, 
  CheckCircle, Play, ArrowLeft, RefreshCw, AlertCircle, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../../components/student/Navbar";
import { 
  createDefaultDeviceState, 
  VrpTerminalSession, 
  simulatePingTrace,
  maskLengthToDotted
} from "../../services/enspSimService";
import { listLabs, getLabDetails, submitLabAttempt } from "../../services/api";

export default function Simulator() {
  const { labId } = useParams();
  const navigate = useNavigate();
  
  // Labs listing state
  const [labs, setLabs] = useState([]);
  const [isLoadingLabs, setIsLoadingLabs] = useState(true);
  
  // Active Lab state
  const [lab, setLab] = useState(null);
  const [isLoadingLab, setIsLoadingLab] = useState(false);

  // Topology state
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [deviceStates, setDeviceStates] = useState({}); // name -> state
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Cabling connection mode state
  const [cableMode, setCableMode] = useState(false);
  const [cableSourceNodeId, setCableSourceNodeId] = useState(null);
  const [cableSourceInterface, setCableSourceInterface] = useState("");
  const [showInterfaceModal, setShowInterfaceModal] = useState(false);
  const [interfaceModalType, setInterfaceModalType] = useState("source"); // source, target
  const [modalNodeId, setModalNodeId] = useState(null);
  const [modalInterfaces, setModalInterfaces] = useState([]);

  // Dragging nodes state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const canvasRef = useRef(null);

  // Terminal Console state
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState({}); // nodeId -> string array
  const [terminalInput, setTerminalInput] = useState("");
  const terminalEndRef = useRef(null);

  // Verification & Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const token = localStorage.getItem("token") || "";

  // ----------------------------------------------------
  // API CALLS
  // ----------------------------------------------------
  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    if (!labId) {
      fetchLabs();
    } else {
      fetchLabDetails(labId);
    }
  }, [labId]);

  const fetchLabs = async () => {
    try {
      setIsLoadingLabs(true);
      const res = await listLabs();
      setLabs(res.labs || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load assigned labs.");
    } finally {
      setIsLoadingLabs(false);
    }
  };

  const fetchLabDetails = async (id) => {
    try {
      setIsLoadingLab(true);
      const res = await getLabDetails(id);
      const labData = res.lab;
      setLab(labData);
      
      // Load initial state if present
      const initial = labData.initialState || {};
      setNodes(initial.nodes || []);
      setLinks(initial.links || []);
      setDeviceStates(initial.deviceStates || {});
      setSelectedNodeId(null);
      setShowTerminal(false);
      setTerminalLogs({});
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load lab workspace.");
    } finally {
      setIsLoadingLab(false);
    }
  };

  const submitLab = async () => {
    if (!lab) return;
    try {
      setIsSubmitting(true);
      setErrorMsg("");
      
      const topology = { nodes, links };
      const configs = {};
      
      // Extract hostname and configurations from active states
      Object.entries(deviceStates).forEach(([nodeName, state]) => {
        configs[nodeName] = {
          hostname: state.hostname,
          interfaces: state.interfaces,
          ospf: state.ospf,
          staticRoutes: state.staticRoutes
        };
      });

      const res = await submitLabAttempt(lab.id, {
        topology,
        configs
      });

      setSubmissionResult(res.attempt);
    } catch (err) {
      console.error(err);
      setErrorMsg("Submission failed: " + (err.response?.data?.message || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // TOPOLOGY CANVAS INTERACTION
  // ----------------------------------------------------
  const addNode = (type) => {
    const counts = nodes.filter(n => n.type === type).length + 1;
    const name = `${type}${counts}`;
    const id = `node_${Date.now()}`;
    const newNode = {
      id,
      type,
      name,
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200
    };

    setNodes([...nodes, newNode]);
    setDeviceStates(prev => ({
      ...prev,
      [name]: createDefaultDeviceState(type, name)
    }));
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (!node) return;

    // Remove node
    setNodes(nodes.filter(n => n.id !== selectedNodeId));
    // Remove links connected to this node
    setLinks(links.filter(l => l.fromNodeId !== selectedNodeId && l.toNodeId !== selectedNodeId));
    
    // Remove state
    const nextStates = { ...deviceStates };
    delete nextStates[node.name];
    setDeviceStates(nextStates);

    setSelectedNodeId(null);
    setShowTerminal(false);
  };

  // Drag-and-drop SVG math
  const handleMouseDown = (e, nodeId) => {
    e.stopPropagation();
    if (cableMode) {
      handleCableSelectNode(nodeId);
      return;
    }
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !draggedNodeId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setNodes(nodes.map(n => n.id === draggedNodeId ? { ...n, x, y } : n));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
  };

  // Cabling Flow
  const startCabling = () => {
    setCableMode(true);
    setCableSourceNodeId(null);
    setCableSourceInterface("");
    setSelectedNodeId(null);
  };

  const handleCableSelectNode = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const state = deviceStates[node.name];
    if (!state) return;

    // Get list of available (unconnected) interfaces
    const connectedInts = links
      .filter(l => l.fromNodeId === nodeId || l.toNodeId === nodeId)
      .map(l => l.fromNodeId === nodeId ? l.fromInterface : l.toInterface);

    const availableInts = Object.keys(state.interfaces).filter(i => !connectedInts.includes(i));

    if (availableInts.length === 0) {
      alert("No available interfaces on this device!");
      setCableMode(false);
      return;
    }

    setModalNodeId(nodeId);
    setModalInterfaces(availableInts);
    if (!cableSourceNodeId) {
      setInterfaceModalType("source");
    } else {
      // Don't cable to the same device
      if (nodeId === cableSourceNodeId) {
        alert("Cannot connect a cable to the same device!");
        setCableMode(false);
        return;
      }
      setInterfaceModalType("target");
    }
    setShowInterfaceModal(true);
  };

  const selectInterface = (intName) => {
    setShowInterfaceModal(false);
    if (interfaceModalType === "source") {
      setCableSourceNodeId(modalNodeId);
      setCableSourceInterface(intName);
    } else {
      // Connect wires
      const newLink = {
        id: `link_${Date.now()}`,
        fromNodeId: cableSourceNodeId,
        fromInterface: cableSourceInterface,
        toNodeId: modalNodeId,
        toInterface: intName
      };
      setLinks([...links, newLink]);
      setCableMode(false);
      setCableSourceNodeId(null);
      setCableSourceInterface("");
    }
  };

  // ----------------------------------------------------
  // TERMINAL INPUT HANDLING
  // ----------------------------------------------------
  const getActiveNode = () => nodes.find(n => n.id === selectedNodeId);

  const openConsole = () => {
    const node = getActiveNode();
    if (!node) return;
    
    // Initialize CLI logs if empty
    if (!terminalLogs[node.id]) {
      const state = deviceStates[node.name];
      const model = new VrpTerminalSession(state, node.type);
      const initialPrompt = model.getPrompt();
      setTerminalLogs(prev => ({
        ...prev,
        [node.id]: [`Huawei Versatile Routing Platform Software (VRP)\nCopyleft (C) 2026 Huawei Technologies Co., Ltd.\n`, initialPrompt]
      }));
    }
    setShowTerminal(true);
  };

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs, selectedNodeId, showTerminal]);

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    const node = getActiveNode();
    if (!node || !terminalInput.trim()) return;

    const command = terminalInput;
    setTerminalInput("");

    const state = deviceStates[node.name];
    const session = new VrpTerminalSession(state, node.type);
    
    // Execute command in simulator session
    const res = session.execute(command);

    // Save configuration changes back to state
    setDeviceStates(prev => ({
      ...prev,
      [node.name]: session.state
    }));

    // Handle Ping actions
    if (res.output.startsWith("__PING_INITIATE__:")) {
      const targetIp = res.output.split(":")[1];
      const currentLogs = terminalLogs[node.id] || [];
      
      setTerminalLogs(prev => ({
        ...prev,
        [node.id]: [...currentLogs, `\n${session.getPrompt()}${command}`, `PING ${targetIp}: 56  data bytes, press CTRL_C to break`]
      }));

      // Simulate ping across wires
      setTimeout(() => {
        const trace = simulatePingTrace(node.id, targetIp, { nodes, links }, deviceStates);
        
        let pingOutput = "";
        if (trace.success) {
          pingOutput = `\nReply from ${targetIp}: bytes=56 Sequence=1 ttl=255 time=1 ms\nReply from ${targetIp}: bytes=56 Sequence=2 ttl=255 time=1 ms\nReply from ${targetIp}: bytes=56 Sequence=3 ttl=255 time=1 ms\n\n--- ${targetIp} ping statistics ---\n3 packet(s) transmitted, 3 packet(s) received, 0.00% packet loss\nround-trip min/avg/max = 1/1/1 ms`;
        } else {
          pingOutput = `\nRequest time out.\nRequest time out.\nRequest time out.\n\n--- ${targetIp} ping statistics ---\n3 packet(s) transmitted, 0 packet(s) received, 100.00% packet loss`;
        }

        const refreshedSession = new VrpTerminalSession(session.state, node.type);
        setTerminalLogs(prev => ({
          ...prev,
          [node.id]: [...(prev[node.id] || []), pingOutput, `\n${refreshedSession.getPrompt()}`]
        }));
      }, 1000);

    } else {
      // Standard output print
      const outText = res.output ? `\n${res.output}` : "";
      const currentLogs = terminalLogs[node.id] || [];
      setTerminalLogs(prev => ({
        ...prev,
        [node.id]: [...currentLogs, `\n${session.getPrompt()}${command}${outText}`, `\n${res.prompt}`]
      }));
    }
  };

  // ----------------------------------------------------
  // RENDER SECTIONS
  // ----------------------------------------------------
  if (!labId) {
    // RENDER ASSIGNED LABS LIST
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-6 w-full py-10 flex-1">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Assigned eNSP Labs</h1>
            <p className="text-sm text-slate-500">Pick any available network topology lab to practice routing and switching configurations.</p>
          </div>

          {isLoadingLabs ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
          ) : labs.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center shadow-sm">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <h3 className="text-lg font-semibold text-slate-800">No Assigned Labs</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">Your instructor hasn't assigned any eNSP simulation labs to your profile yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {labs.map(l => (
                <div key={l.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        l.difficulty === "easy" ? "bg-green-50 text-green-700" :
                        l.difficulty === "hard" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {l.difficulty.toUpperCase()}
                      </span>
                      {l.passed && (
                        <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                          <CheckCircle size={12} /> Passed ({l.bestScore}%)
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{l.title}</h3>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{l.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-xs text-slate-400 font-medium">Attempts: {l.attemptsCount || 0}</span>
                    <button 
                      onClick={() => navigate(`/student/simulator/${l.id}`)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 py-2 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Play size={12} className="fill-white" /> Start Lab
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // RENDER SIMULATOR LAB WORKSPACE
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Workspace Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 flex justify-between items-center px-4 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/student/simulator")}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">{lab?.title || "eNSP Lab"}</h1>
            <p className="text-[10px] text-slate-400">Simulation Environment</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={submitLab}
            disabled={isSubmitting || nodes.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full px-5 py-2 text-xs font-bold transition-all shadow-lg flex items-center gap-1.5"
          >
            {isSubmitting ? "Verifying..." : "Verify & Submit"}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Side Palette */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 p-4 flex flex-col gap-4 flex-shrink-0 z-10">
          <div>
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Device Palette</h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => addNode("Router")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all group"
              >
                <Cpu size={24} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold">Router</span>
              </button>
              <button 
                onClick={() => addNode("Switch")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all group"
              >
                <Server size={24} className="text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold">Switch</span>
              </button>
              <button 
                onClick={() => addNode("PC")}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 p-3 rounded-2xl flex flex-col items-center gap-2 transition-all group animate-fade-in"
              >
                <Monitor size={24} className="text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold">PC</span>
              </button>
              <button 
                onClick={startCabling}
                disabled={nodes.length < 2}
                className={`border p-3 rounded-2xl flex flex-col items-center gap-2 transition-all group ${
                  cableMode 
                    ? "bg-indigo-900 border-indigo-500 animate-pulse text-white" 
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 disabled:opacity-40"
                }`}
              >
                <Cable size={24} className="text-indigo-300" />
                <span className="text-[10px] font-semibold">{cableMode ? "Cabling..." : "Cable Link"}</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 border-t border-slate-800 pt-4">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex-shrink-0">Lab Objectives</h3>
            <div className="flex-1 overflow-y-auto pr-1 text-xs text-slate-300 space-y-2.5 font-sans leading-relaxed">
              {lab?.objective ? (
                <div className="whitespace-pre-line text-slate-400 text-[11px] bg-slate-950/40 p-3 rounded-2xl border border-slate-800/80">
                  {lab.objective}
                </div>
              ) : (
                <p className="text-slate-500 italic text-[11px]">No objective instructions described.</p>
              )}
            </div>
          </div>
          
          {selectedNodeId && (
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col gap-2 flex-shrink-0">
              <div className="text-[11px] font-bold text-white uppercase tracking-wider mb-1 truncate">
                Selected: {getActiveNode()?.name}
              </div>
              <button 
                onClick={openConsole}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-full py-1.5 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <Terminal size={12} /> Open Console
              </button>
              <button 
                onClick={deleteSelectedNode}
                className="w-full bg-red-950 hover:bg-red-900 text-red-400 rounded-full py-1.5 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <Trash2 size={12} /> Delete Device
              </button>
            </div>
          )}
        </aside>

        {/* Central Canvas Workspace */}
        <main 
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`flex-1 relative bg-slate-900/60 overflow-hidden select-none ${
            cableMode ? "cursor-crosshair" : "cursor-default"
          }`}
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          {cableMode && (
            <div className="absolute top-4 left-4 bg-indigo-600/90 text-white text-[11px] font-bold rounded-full px-4 py-1.5 shadow-md flex items-center gap-1.5 animate-bounce z-10">
              <Sparkles size={12} />
              {cableSourceNodeId 
                ? `Click target device to connect ${cableSourceInterface}` 
                : "Click source device to start cabling..."}
            </div>
          )}

          {/* SVG Connections and node models */}
          <svg className="w-full h-full absolute inset-0 pointer-events-none z-0">
            {links.map(l => {
              const fromNode = nodes.find(n => n.id === l.fromNodeId);
              const toNode = nodes.find(n => n.id === l.toNodeId);
              if (!fromNode || !toNode) return null;
              
              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;

              return (
                <g key={l.id}>
                  {/* Cable Wire */}
                  <line 
                    x1={fromNode.x} 
                    y1={fromNode.y} 
                    x2={toNode.x} 
                    y2={toNode.y} 
                    stroke="#4338ca" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />
                  {/* Interface Labels */}
                  <rect x={fromNode.x + (midX - fromNode.x) * 0.4 - 18} y={fromNode.y + (midY - fromNode.y) * 0.4 - 8} width="36" height="14" rx="3" fill="#1e1b4b" stroke="#312e81" strokeWidth="1" />
                  <text 
                    x={fromNode.x + (midX - fromNode.x) * 0.4} 
                    y={fromNode.y + (midY - fromNode.y) * 0.4 + 2} 
                    fill="#a5b4fc" 
                    fontSize="7" 
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {l.fromInterface.replace("GigabitEthernet", "GE")}
                  </text>

                  <rect x={toNode.x + (midX - toNode.x) * 0.4 - 18} y={toNode.y + (midY - toNode.y) * 0.4 - 8} width="36" height="14" rx="3" fill="#1e1b4b" stroke="#312e81" strokeWidth="1" />
                  <text 
                    x={toNode.x + (midX - toNode.x) * 0.4} 
                    y={toNode.y + (midY - toNode.y) * 0.4 + 2} 
                    fill="#a5b4fc" 
                    fontSize="7" 
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {l.toInterface.replace("GigabitEthernet", "GE")}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Draggable Node icons */}
          {nodes.map(n => {
            const isSelected = n.id === selectedNodeId;
            const state = deviceStates[n.name] || {};
            
            return (
              <div 
                key={n.id}
                onMouseDown={(e) => handleMouseDown(e, n.id)}
                className={`absolute w-16 h-16 rounded-3xl flex flex-col items-center justify-center cursor-move transition-shadow z-10 ${
                  isSelected 
                    ? "ring-2 ring-indigo-500 bg-indigo-950/90 shadow-lg shadow-indigo-950/20" 
                    : "bg-slate-800/90 border border-slate-700 hover:border-slate-500 shadow-md"
                }`}
                style={{ left: n.x - 32, top: n.y - 32 }}
              >
                {n.type === "Router" && <Cpu size={24} className="text-indigo-400" />}
                {n.type === "Switch" && <Server size={24} className="text-emerald-400" />}
                {n.type === "PC" && <Monitor size={24} className="text-amber-400" />}
                
                <span className="text-[9px] font-bold mt-1 text-white truncate max-w-[56px]">
                  {state.hostname || n.name}
                </span>
              </div>
            );
          })}
        </main>

        {/* CLI Terminal Overlay panel */}
        <AnimatePresence>
          {showTerminal && selectedNodeId && (
            <motion.div 
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              className="absolute bottom-0 right-0 left-0 h-64 bg-slate-950 border-t border-slate-800 flex flex-col z-10"
            >
              {/* Terminal Header */}
              <div className="h-8 bg-slate-900 border-b border-slate-800 flex justify-between items-center px-4 flex-shrink-0 select-none">
                <span className="text-[10px] font-bold text-slate-300 font-mono flex items-center gap-1.5">
                  <Terminal size={10} className="text-indigo-400" />
                  Console Session - {getActiveNode()?.name}
                </span>
                <button 
                  onClick={() => setShowTerminal(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold font-sans"
                >
                  Minimize
                </button>
              </div>

              {/* Console Logs */}
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs text-slate-200 select-text custom-scrollbar space-y-1">
                {(terminalLogs[selectedNodeId] || []).map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap">{log}</div>
                ))}
                <div ref={terminalEndRef} />
              </div>

              {/* Console Input */}
              <form onSubmit={handleTerminalSubmit} className="h-9 border-t border-slate-800 flex items-center flex-shrink-0 bg-slate-950 px-4">
                <span className="text-indigo-400 text-xs font-bold mr-1.5 font-mono">VRP&gt;</span>
                <input 
                  type="text" 
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-white placeholder-slate-600"
                  placeholder="Type VRP command (e.g. sys, display ip interface brief)..."
                  autoFocus
                />
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interface selection Modal */}
      {showInterfaceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-bold text-white mb-2">Select Interface Connection</h3>
            <p className="text-[11px] text-slate-400 mb-4">Choose which interface port to connect the cable to.</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {modalInterfaces.map(i => (
                <button
                  key={i}
                  onClick={() => selectInterface(i)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl py-2 px-3 text-center border border-slate-700 transition-colors"
                >
                  {i.replace("GigabitEthernet", "GE")}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowInterfaceModal(false);
                setCableMode(false);
              }}
              className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-full py-2 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Submission Results Modal */}
      <AnimatePresence>
        {submissionResult && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 max-w-lg w-full flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  submissionResult.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {submissionResult.passed ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Lab Attempt Submission</h3>
                  <p className="text-[10px] text-slate-400">Grading results & status report</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Score</div>
                  <div className="text-2xl font-black text-white">{submissionResult.score}%</div>
                </div>
                <div className="text-center border-l border-slate-800">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Result</div>
                  <div className={`text-sm font-black mt-1 ${submissionResult.passed ? "text-emerald-400" : "text-red-400"}`}>
                    {submissionResult.passed ? "PASSED" : "FAILED / NEEDS REVIEW"}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 mb-6 space-y-2 text-xs font-mono select-text custom-scrollbar">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Verification Details:</div>
                {(submissionResult.checks || []).map((check, i) => {
                  const isFail = check.toLowerCase().includes("failed");
                  return (
                    <div key={i} className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                      isFail ? "bg-red-950/20 border-red-900/50 text-red-200" : "bg-emerald-950/20 border-emerald-900/50 text-emerald-200"
                    }`}>
                      <span className="mt-0.5">{isFail ? "❌" : "✅"}</span>
                      <span className="leading-snug">{check}</span>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setSubmissionResult(null);
                  navigate("/student/simulator");
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-2.5 text-xs font-bold transition-colors w-full shadow-lg"
              >
                Close & Return
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
