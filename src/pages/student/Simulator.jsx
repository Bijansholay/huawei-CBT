import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Terminal, Cable, Cpu, Server, Monitor, HardDrive, Cloud, Network,
  Trash2, CheckCircle, Play, ArrowLeft, RefreshCw, AlertCircle, Sparkles,
  Square, ZoomIn, ZoomOut, Maximize2, Grid, Layers, X, Move, Settings,
  RotateCcw, Save, StopCircle, LayoutGrid, Minimize2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "../../components/student/Navbar";
import { 
  createDefaultDeviceState, 
  VrpTerminalSession, 
  simulatePingTrace,
  maskLengthToDotted
} from "../../services/enspSimService";
import { listLabs, getLabDetails, submitLabAttempt, getToken } from "../../services/api";

export default function Simulator() {
  const { labId } = useParams();
  const navigate = useNavigate();
  
  // Labs listing state
  const [labs, setLabs] = useState([]);
  const [isLoadingLabs, setIsLoadingLabs] = useState(true);
  
  // Active Lab state
  const [lab, setLab] = useState(null);
  const [isLoadingLab, setIsLoadingLab] = useState(false);

  // Simulation Engine state
  const [isSimRunning, setIsSimRunning] = useState(true);

  // Topology state
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [deviceStates, setDeviceStates] = useState({}); // name -> state
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Canvas view controls
  const [zoomLevel, setZoomLevel] = useState(1); // 0.75, 1, 1.25
  const [showGrid, setShowGrid] = useState(true);

  // Palette Category state
  const [activeCategory, setActiveCategory] = useState("routers"); // routers, switches, end_devices, hubs, cloud, connections

  // Cabling connection mode state
  const [cableMode, setCableMode] = useState(false);
  const [cableSourceNodeId, setCableSourceNodeId] = useState(null);
  const [cableSourceInterface, setCableSourceInterface] = useState("");
  const [showInterfaceModal, setShowInterfaceModal] = useState(false);
  const [interfaceModalType, setInterfaceModalType] = useState("source"); // source, target
  const [modalNodeId, setModalNodeId] = useState(null);
  const [modalInterfaces, setModalInterfaces] = useState([]);

  // Right-click Context Menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, nodeId }

  // Dragging nodes state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  // Multiple Floatable/Tileable CLI Windows Manager
  // openTerminals: array of { nodeId, x, y, width, height, minimized, zIndex }
  const [openTerminals, setOpenTerminals] = useState([]);
  const [terminalLogs, setTerminalLogs] = useState({}); // nodeId -> string array
  const [terminalInputs, setTerminalInputs] = useState({}); // nodeId -> string input
  const [highestZIndex, setHighestZIndex] = useState(10);
  const [draggingWindowId, setDraggingWindowId] = useState(null);
  const [windowDragOffset, setWindowDragOffset] = useState({ x: 0, y: 0 });

  // Quick Device Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsNodeId, setSettingsNodeId] = useState(null);

  // Verification & Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showObjectivesPanel, setShowObjectivesPanel] = useState(true);

  const token = getToken();

  // ----------------------------------------------------
  // INITIALIZATION & API FETCH
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
  }, [labId, token]);

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
      setOpenTerminals([]);
      setTerminalLogs({});
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load lab workspace.");
    } finally {
      setIsLoadingLab(false);
    }
  };

  // Close context menu on outside click
  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // ----------------------------------------------------
  // SUBMISSION HANDLER
  // ----------------------------------------------------
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
  // CANVAS TOPOLOGY CONTROLS
  // ----------------------------------------------------
  const addNode = (type, subName = null) => {
    const counts = nodes.filter(n => n.type === type).length + 1;
    const baseName = subName || type;
    const name = `${baseName}${counts}`;
    const id = `node_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    
    // Position node nicely on canvas
    const x = 120 + (nodes.length % 4) * 160 + Math.random() * 20;
    const y = 100 + Math.floor(nodes.length / 4) * 140 + Math.random() * 20;

    const newNode = {
      id,
      type,
      name,
      x,
      y
    };

    setNodes(prev => [...prev, newNode]);
    setDeviceStates(prev => ({
      ...prev,
      [name]: createDefaultDeviceState(type, name)
    }));
  };

  const deleteNodeById = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Remove node
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    // Remove links connected to this node
    setLinks(prev => prev.filter(l => l.fromNodeId !== nodeId && l.toNodeId !== nodeId));
    
    // Remove device state
    setDeviceStates(prev => {
      const next = { ...prev };
      delete next[node.name];
      return next;
    });

    // Close terminal window if open
    setOpenTerminals(prev => prev.filter(t => t.nodeId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setContextMenu(null);
  };

  const clearCanvas = () => {
    if (nodes.length === 0) return;
    if (window.confirm("Are you sure you want to clear the canvas topology?")) {
      setNodes([]);
      setLinks([]);
      setDeviceStates({});
      setSelectedNodeId(null);
      setOpenTerminals([]);
    }
  };

  // Drag-and-drop node logic
  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    if (e.button === 2) {
      // Right click handled by onContextMenu
      return;
    }
    if (cableMode) {
      handleCableSelectNode(nodeId);
      return;
    }
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setDragOffset({
      x: (e.clientX - rect.left) / zoomLevel - node.x,
      y: (e.clientY - rect.top) / zoomLevel - node.y
    });
  };

  const handleCanvasMouseMove = (e) => {
    // 1. Dragging Node on Canvas
    if (isDragging && draggedNodeId && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = Math.max(30, Math.min(rect.width / zoomLevel - 30, (e.clientX - rect.left) / zoomLevel - dragOffset.x));
      const newY = Math.max(30, Math.min(rect.height / zoomLevel - 30, (e.clientY - rect.top) / zoomLevel - dragOffset.y));

      setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x: newX, y: newY } : n));
    }

    // 2. Dragging CLI Window
    if (draggingWindowId) {
      setOpenTerminals(prev => prev.map(t => {
        if (t.nodeId === draggingWindowId) {
          return {
            ...t,
            x: Math.max(10, e.clientX - windowDragOffset.x),
            y: Math.max(50, e.clientY - windowDragOffset.y)
          };
        }
        return t;
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
    setDraggingWindowId(null);
  };

  const handleNodeContextMenu = (e, nodeId) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      nodeId
    });
  };

  // ----------------------------------------------------
  // CABLING ENGINE
  // ----------------------------------------------------
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

    const availableInts = Object.keys(state.interfaces || {}).filter(i => !connectedInts.includes(i));

    if (availableInts.length === 0) {
      alert(`No available interfaces on device ${node.name}!`);
      setCableMode(false);
      return;
    }

    setModalNodeId(nodeId);
    setModalInterfaces(availableInts);
    if (!cableSourceNodeId) {
      setInterfaceModalType("source");
    } else {
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
        id: `link_${Date.now()}_${Math.floor(Math.random()*1000)}`,
        fromNodeId: cableSourceNodeId,
        fromInterface: cableSourceInterface,
        toNodeId: modalNodeId,
        toInterface: intName
      };
      setLinks(prev => [...prev, newLink]);
      setCableMode(false);
      setCableSourceNodeId(null);
      setCableSourceInterface("");
    }
  };

  // ----------------------------------------------------
  // MULTI-CLI FLOATING TERMINAL WINDOWS MANAGER
  // ----------------------------------------------------
  const openCliWindow = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setContextMenu(null);

    // Check if CLI is already open
    const existing = openTerminals.find(t => t.nodeId === nodeId);
    if (existing) {
      // Bring to front
      const nextZ = highestZIndex + 1;
      setHighestZIndex(nextZ);
      setOpenTerminals(prev => prev.map(t => t.nodeId === nodeId ? { ...t, zIndex: nextZ, minimized: false } : t));
      return;
    }

    // Initialize CLI logs if empty
    if (!terminalLogs[nodeId]) {
      const state = deviceStates[node.name] || createDefaultDeviceState(node.type, node.name);
      const model = new VrpTerminalSession(state, node.type);
      const initialPrompt = model.getPrompt();
      setTerminalLogs(prev => ({
        ...prev,
        [nodeId]: [`Huawei Versatile Routing Platform Software (VRP)\nCopyleft (C) 2026 Huawei Technologies Co., Ltd.\n`, initialPrompt]
      }));
    }

    // Calculate window cascade offset
    const index = openTerminals.length;
    const startX = 260 + (index % 3) * 40;
    const startY = 90 + (index % 3) * 40;
    const nextZ = highestZIndex + 1;
    setHighestZIndex(nextZ);

    setOpenTerminals(prev => [
      ...prev,
      {
        nodeId,
        x: startX,
        y: startY,
        width: 520,
        height: 320,
        minimized: false,
        zIndex: nextZ
      }
    ]);
  };

  const focusCliWindow = (nodeId) => {
    const nextZ = highestZIndex + 1;
    setHighestZIndex(nextZ);
    setOpenTerminals(prev => prev.map(t => t.nodeId === nodeId ? { ...t, zIndex: nextZ } : t));
  };

  const closeCliWindow = (nodeId) => {
    setOpenTerminals(prev => prev.filter(t => t.nodeId !== nodeId));
  };

  const toggleMinimizeCliWindow = (nodeId) => {
    setOpenTerminals(prev => prev.map(t => t.nodeId === nodeId ? { ...t, minimized: !t.minimized } : t));
  };

  const tileCliWindows = () => {
    if (openTerminals.length === 0) return;
    const count = openTerminals.length;
    const cols = count > 1 ? 2 : 1;
    const rows = Math.ceil(count / cols);
    const winWidth = Math.floor((window.innerWidth - 300) / cols);
    const winHeight = Math.floor((window.innerHeight - 180) / rows);

    setOpenTerminals(prev => prev.map((t, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        ...t,
        x: 260 + col * winWidth,
        y: 80 + row * winHeight,
        width: winWidth - 10,
        height: winHeight - 10,
        minimized: false
      };
    }));
  };

  const handleTerminalSubmit = (e, nodeId) => {
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    const inputVal = terminalInputs[nodeId] || "";
    if (!node || !inputVal.trim()) return;

    const command = inputVal.trim();
    setTerminalInputs(prev => ({ ...prev, [nodeId]: "" }));

    const state = deviceStates[node.name] || createDefaultDeviceState(node.type, node.name);
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
        [node.id]: [...currentLogs, `\n${session.getPrompt()}${command}`, `PING ${targetIp}: 56 data bytes, press CTRL_C to break`]
      }));

      // Simulate ping across wires if simulation is running
      setTimeout(() => {
        if (!isSimRunning) {
          setTerminalLogs(prev => ({
            ...prev,
            [node.id]: [...(prev[node.id] || []), `\nError: Simulation engine is STOPPED. Start simulation to test network traffic.`, `\n${session.getPrompt()}`]
          }));
          return;
        }

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
      }, 800);

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
  // RENDER: ASSIGNED LABS LIST (If no active labId)
  // ----------------------------------------------------
  if (!labId) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="max-w-5xl mx-auto px-6 w-full py-10 flex-1">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Huawei eNSP Practice Labs</h1>
            <p className="text-sm text-slate-500">Pick any available network topology lab to practice routing, switching, and VRP CLI configurations.</p>
          </div>

          {isLoadingLabs ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
            </div>
          ) : labs.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center shadow-sm">
              <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <h3 className="text-lg font-semibold text-slate-800">No Assigned Labs</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">Your instructor hasn't assigned any eNSP simulation labs to your profile yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {labs.map(l => (
                <div key={l.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        l.difficulty === "easy" ? "bg-emerald-50 text-emerald-700" :
                        l.difficulty === "hard" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {l.difficulty}
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
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-medium">Submissions: {l.attemptsCount || 0}</span>
                    <button 
                      onClick={() => navigate(`/student/simulator/${l.id}`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-2 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Play size={12} className="fill-white" /> Open eNSP Lab
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

  // ----------------------------------------------------
  // RENDER: HUAWEI eNSP WORKSPACE
  // ----------------------------------------------------
  return (
    <div 
      className="h-screen flex flex-col bg-slate-100 text-slate-800 overflow-hidden font-sans select-none"
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
    >
      {/* ----------------------------------------------------
          TOP eNSP BLUE TOOLBAR & HEADER
          ---------------------------------------------------- */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-3 flex-shrink-0 z-30 shadow-md">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate("/student/simulator")}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Back to Labs"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-1 rounded-md">
              <Network size={14} />
            </div>
            <div>
              <h1 className="text-xs font-bold text-white tracking-tight leading-none">{lab?.title || "eNSP Topology Lab"}</h1>
              <span className="text-[9px] text-slate-400 font-medium">Huawei Enterprise Network Simulation Platform</span>
            </div>
          </div>
        </div>

        {/* Center Toolbar Icons */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={clearCanvas} 
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-medium"
            title="New Topology / Clear Canvas"
          >
            <RotateCcw size={14} className="text-amber-400" />
            <span className="hidden sm:inline">New</span>
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Start / Stop Simulation */}
          <button 
            onClick={() => setIsSimRunning(true)}
            className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
              isSimRunning ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/50" : "hover:bg-slate-800 text-slate-400"
            }`}
            title="Start Simulation Engine"
          >
            <Play size={14} className={isSimRunning ? "fill-emerald-400" : ""} />
            <span className="hidden sm:inline">Run</span>
          </button>

          <button 
            onClick={() => setIsSimRunning(false)}
            className={`p-1.5 rounded-lg flex items-center gap-1 text-[11px] font-bold transition-all ${
              !isSimRunning ? "bg-rose-600/30 text-rose-400 border border-rose-500/50" : "hover:bg-slate-800 text-slate-400"
            }`}
            title="Stop Simulation Engine"
          >
            <StopCircle size={14} />
            <span className="hidden sm:inline">Stop</span>
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Zoom controls */}
          <button 
            onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.15))}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <span className="text-[10px] font-mono text-slate-400 px-1">{Math.round(zoomLevel * 100)}%</span>
          <button 
            onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.15))}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          <div className="w-px h-4 bg-slate-800 mx-1" />

          {/* Grid Toggle */}
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg text-slate-300 hover:text-white transition-colors ${
              showGrid ? "bg-blue-600/30 text-blue-400" : "hover:bg-slate-800"
            }`}
            title="Toggle Grid Lines"
          >
            <Grid size={14} />
          </button>

          {/* Tile CLI Windows */}
          {openTerminals.length > 0 && (
            <button 
              onClick={tileCliWindows}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 text-[11px] font-medium"
              title="Tile Open CLI Windows Side-by-Side"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Tile CLIs</span>
            </button>
          )}

          {/* Delete Selected Node */}
          {selectedNodeId && (
            <button 
              onClick={() => deleteNodeById(selectedNodeId)}
              className="p-1.5 hover:bg-rose-900/50 rounded-lg text-rose-400 transition-colors"
              title="Delete Selected Device"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Right: Submit Button & Objectives toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowObjectivesPanel(!showObjectivesPanel)}
            className="text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-slate-200 transition-colors"
          >
            {showObjectivesPanel ? "Hide Tasks" : "View Tasks"}
          </button>
          
          <button
            onClick={submitLab}
            disabled={isSubmitting || nodes.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
          >
            {isSubmitting ? "Verifying..." : "Verify & Submit"}
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------
          MAIN WORKSPACE (PALETTE + CANVAS + OBJECTIVES)
          ---------------------------------------------------- */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* LEFT DEVICE PALETTE SIDEBAR */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col flex-shrink-0 z-20 shadow-md">
          {/* Category Tabs Header */}
          <div className="bg-slate-950 p-2 border-b border-slate-800 grid grid-cols-5 gap-1 text-center">
            <button 
              onClick={() => setActiveCategory("routers")}
              className={`p-1.5 rounded-lg flex justify-center items-center transition-colors ${
                activeCategory === "routers" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900"
              }`}
              title="Routers"
            >
              <Cpu size={16} />
            </button>
            <button 
              onClick={() => setActiveCategory("switches")}
              className={`p-1.5 rounded-lg flex justify-center items-center transition-colors ${
                activeCategory === "switches" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900"
              }`}
              title="Switches"
            >
              <Server size={16} />
            </button>
            <button 
              onClick={() => setActiveCategory("end_devices")}
              className={`p-1.5 rounded-lg flex justify-center items-center transition-colors ${
                activeCategory === "end_devices" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900"
              }`}
              title="End Devices (PC/Client/Server)"
            >
              <Monitor size={16} />
            </button>
            <button 
              onClick={() => setActiveCategory("hubs")}
              className={`p-1.5 rounded-lg flex justify-center items-center transition-colors ${
                activeCategory === "hubs" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900"
              }`}
              title="Hubs & Concentrators"
            >
              <HardDrive size={16} />
            </button>
            <button 
              onClick={() => setActiveCategory("cloud")}
              className={`p-1.5 rounded-lg flex justify-center items-center transition-colors ${
                activeCategory === "cloud" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-900"
              }`}
              title="WAN & Cloud"
            >
              <Cloud size={16} />
            </button>
          </div>

          {/* Palette Devices List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs font-sans custom-scrollbar">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {activeCategory === "routers" && "AR Series Routers"}
              {activeCategory === "switches" && "S Series Switches"}
              {activeCategory === "end_devices" && "End User Terminals"}
              {activeCategory === "hubs" && "Ethernet Hubs"}
              {activeCategory === "cloud" && "WAN & Cloud Nodes"}
            </div>

            {/* ROUTERS */}
            {activeCategory === "routers" && (
              <>
                <button
                  onClick={() => addNode("Router", "AR2220")}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl flex items-center gap-3 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">AR2220</div>
                    <div className="text-[9px] text-slate-400">Enterprise Router (3x GE)</div>
                  </div>
                </button>

                <button
                  onClick={() => addNode("Router", "Router")}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl flex items-center gap-3 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">Generic Router</div>
                    <div className="text-[9px] text-slate-400">Standard VRP Router</div>
                  </div>
                </button>
              </>
            )}

            {/* SWITCHES */}
            {activeCategory === "switches" && (
              <>
                <button
                  onClick={() => addNode("Switch", "S5700")}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl flex items-center gap-3 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Server size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">S5700 Switch</div>
                    <div className="text-[9px] text-slate-400">Layer 2/3 Switch (8x GE)</div>
                  </div>
                </button>

                <button
                  onClick={() => addNode("Switch", "Switch")}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl flex items-center gap-3 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Server size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">Generic Switch</div>
                    <div className="text-[9px] text-slate-400">Standard VRP Switch</div>
                  </div>
                </button>
              </>
            )}

            {/* END DEVICES */}
            {activeCategory === "end_devices" && (
              <>
                <button
                  onClick={() => addNode("PC", "PC")}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl flex items-center gap-3 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">Standard PC</div>
                    <div className="text-[9px] text-slate-400">Host Terminal (CLI)</div>
                  </div>
                </button>

                <button
                  onClick={() => addNode("Client", "Client")}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl flex items-center gap-3 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                    <Monitor size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">Client Workstation</div>
                    <div className="text-[9px] text-slate-400">DHCP/IP Client</div>
                  </div>
                </button>

                <button
                  onClick={() => addNode("Server", "Server")}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl flex items-center gap-3 transition-all group text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-300 group-hover:scale-105 transition-transform">
                    <Server size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 text-xs">Server</div>
                    <div className="text-[9px] text-slate-400">Network Server Host</div>
                  </div>
                </button>
              </>
            )}

            {/* HUBS */}
            {activeCategory === "hubs" && (
              <button
                onClick={() => addNode("Hub", "Hub")}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl flex items-center gap-3 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                  <HardDrive size={18} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 text-xs">Ethernet Hub</div>
                  <div className="text-[9px] text-slate-400">Multi-port Repeater (4x Eth)</div>
                </div>
              </button>
            )}

            {/* CLOUD */}
            {activeCategory === "cloud" && (
              <button
                onClick={() => addNode("Cloud", "Cloud")}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 rounded-xl flex items-center gap-3 transition-all group text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                  <Cloud size={18} />
                </div>
                <div>
                  <div className="font-bold text-slate-200 text-xs">WAN Cloud</div>
                  <div className="text-[9px] text-slate-400">Cloud Binding Node</div>
                </div>
              </button>
            )}

            {/* CONNECTOR CABLE TOOL */}
            <div className="pt-3 border-t border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Cable Connections</div>
              <button 
                onClick={startCabling}
                disabled={nodes.length < 2}
                className={`w-full p-2.5 rounded-xl border flex items-center gap-3 transition-all ${
                  cableMode 
                    ? "bg-blue-600 text-white border-blue-500 animate-pulse shadow-lg" 
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 disabled:opacity-40"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                  <Cable size={18} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-xs">{cableMode ? "Cabling Active..." : "Auto Copper Cable"}</div>
                  <div className="text-[9px] text-slate-400">Connect Device Ports</div>
                </div>
              </button>
            </div>
          </div>
        </aside>

        {/* CENTRAL LIGHT-GRAY GRID CANVAS */}
        <main 
          ref={canvasRef}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}
          className={`flex-1 relative overflow-hidden select-none bg-[#eef2f6] ${
            cableMode ? "cursor-crosshair" : "cursor-default"
          }`}
          style={{
            backgroundImage: showGrid 
              ? 'radial-gradient(rgba(100, 116, 139, 0.25) 1px, transparent 1px)' 
              : 'none',
            backgroundSize: '24px 24px',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top left'
          }}
        >
          {/* Cabling Hint Overlay */}
          {cableMode && (
            <div className="absolute top-4 left-4 bg-blue-700 text-white text-xs font-bold rounded-full px-4 py-2 shadow-xl flex items-center gap-2 animate-pulse z-30">
              <Sparkles size={14} />
              {cableSourceNodeId 
                ? `Click target device to connect ${cableSourceInterface}` 
                : "Click source device to start cabling..."}
            </div>
          )}

          {/* SVG Connection Cables */}
          <svg className="w-full h-full absolute inset-0 pointer-events-none z-10">
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
                    stroke={isSimRunning ? "#2563eb" : "#64748b"} 
                    strokeWidth="3" 
                    strokeLinecap="round"
                    strokeDasharray={isSimRunning ? "none" : "4 4"}
                  />

                  {/* Interface Labels Badges */}
                  <g transform={`translate(${fromNode.x + (midX - fromNode.x) * 0.45}, ${fromNode.y + (midY - fromNode.y) * 0.45})`}>
                    <rect x="-20" y="-8" width="40" height="16" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                    <text x="0" y="3" fill="#cbd5e1" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                      {l.fromInterface.replace("GigabitEthernet", "GE")}
                    </text>
                  </g>

                  <g transform={`translate(${toNode.x + (midX - toNode.x) * 0.45}, ${toNode.y + (midY - toNode.y) * 0.45})`}>
                    <rect x="-20" y="-8" width="40" height="16" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                    <text x="0" y="3" fill="#cbd5e1" fontSize="8" fontFamily="monospace" textAnchor="middle" fontWeight="bold">
                      {l.toInterface.replace("GigabitEthernet", "GE")}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Draggable Device Nodes */}
          {nodes.map(n => {
            const isSelected = n.id === selectedNodeId;
            const state = deviceStates[n.name] || {};

            return (
              <div 
                key={n.id}
                onMouseDown={(e) => handleNodeMouseDown(e, n.id)}
                onContextMenu={(e) => handleNodeContextMenu(e, n.id)}
                onDoubleClick={() => openCliWindow(n.id)}
                className={`absolute w-16 h-16 rounded-2xl flex flex-col items-center justify-center cursor-move transition-all z-20 ${
                  isSelected 
                    ? "ring-2 ring-blue-600 bg-white shadow-xl scale-105" 
                    : "bg-white/95 border border-slate-300 hover:border-blue-500 shadow-md hover:shadow-lg"
                }`}
                style={{ left: n.x - 32, top: n.y - 32 }}
              >
                {/* Device Icon */}
                {n.type === "Router" && <Cpu size={26} className="text-blue-600" />}
                {n.type === "Switch" && <Server size={26} className="text-emerald-600" />}
                {(n.type === "PC" || n.type === "Client" || n.type === "Server") && <Monitor size={26} className="text-amber-600" />}
                {n.type === "Hub" && <HardDrive size={26} className="text-teal-600" />}
                {n.type === "Cloud" && <Cloud size={26} className="text-sky-600" />}

                {/* LED Status Indicator */}
                <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                  isSimRunning ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`} />

                {/* Device Label */}
                <span className="text-[10px] font-bold mt-1 text-slate-800 truncate max-w-[60px] bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-200">
                  {state.hostname || n.name}
                </span>
              </div>
            );
          })}

          {/* RIGHT-CLICK CONTEXT MENU */}
          {contextMenu && (
            <div 
              className="fixed bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl py-1 w-44 z-50 text-xs font-sans"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => openCliWindow(contextMenu.nodeId)}
                className="w-full px-3 py-2 text-left hover:bg-blue-600 flex items-center gap-2 transition-colors font-semibold"
              >
                <Terminal size={14} className="text-blue-400" /> Open CLI Console
              </button>
              <button 
                onClick={() => {
                  setSettingsNodeId(contextMenu.nodeId);
                  setShowSettingsModal(true);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-800 flex items-center gap-2 transition-colors text-slate-300"
              >
                <Settings size={14} className="text-slate-400" /> Device Settings
              </button>
              <div className="h-px bg-slate-800 my-1" />
              <button 
                onClick={() => deleteNodeById(contextMenu.nodeId)}
                className="w-full px-3 py-2 text-left hover:bg-rose-900/60 text-rose-400 flex items-center gap-2 transition-colors font-semibold"
              >
                <Trash2 size={14} /> Delete Device
              </button>
            </div>
          )}
        </main>

        {/* LAB OBJECTIVES INSTRUCTION PANEL */}
        <AnimatePresence>
          {showObjectivesPanel && (
            <motion.aside 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-64 bg-slate-900 border-l border-slate-800 text-slate-200 p-4 flex flex-col flex-shrink-0 z-20 shadow-md"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-blue-400" /> Lab Instructions
                </h3>
                <button onClick={() => setShowObjectivesPanel(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 text-xs text-slate-300 space-y-2.5 font-sans leading-relaxed custom-scrollbar">
                {lab?.objective ? (
                  <div className="whitespace-pre-line text-slate-300 text-[11px] bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    {lab.objective}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-[11px]">No objective instructions described.</p>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ----------------------------------------------------
          MULTIPLE FLOATABLE / TILEABLE CLI WINDOWS MANAGER
          ---------------------------------------------------- */}
      {openTerminals.map(t => {
        const node = nodes.find(n => n.id === t.nodeId);
        if (!node) return null;
        const state = deviceStates[node.name] || {};

        return (
          <div 
            key={t.nodeId}
            onClick={() => focusCliWindow(t.nodeId)}
            className={`fixed rounded-2xl shadow-2xl border flex flex-col overflow-hidden text-slate-200 transition-shadow ${
              t.minimized ? "h-9 w-64" : ""
            } ${
              t.zIndex === highestZIndex ? "border-blue-500 shadow-blue-950/40" : "border-slate-800"
            }`}
            style={{ 
              left: t.x, 
              top: t.y, 
              width: t.minimized ? 260 : t.width, 
              height: t.minimized ? 36 : t.height,
              zIndex: t.zIndex,
              backgroundColor: '#0c0c0c'
            }}
          >
            {/* FLOATING CLI WINDOW HEADER */}
            <div 
              onMouseDown={(e) => {
                setDraggingWindowId(t.nodeId);
                setWindowDragOffset({ x: e.clientX - t.x, y: e.clientY - t.y });
                focusCliWindow(t.nodeId);
              }}
              className="h-9 bg-slate-900 border-b border-slate-800 flex justify-between items-center px-3 cursor-move flex-shrink-0 select-none"
            >
              <div className="flex items-center gap-2">
                <Terminal size={13} className="text-blue-400" />
                <span className="text-xs font-bold text-white font-mono">
                  CLI: {state.hostname || node.name} ({node.type})
                </span>
              </div>

              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => toggleMinimizeCliWindow(t.nodeId)}
                  className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                  title="Minimize"
                >
                  <Minimize2 size={12} />
                </button>
                <button 
                  onClick={() => closeCliWindow(t.nodeId)}
                  className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
                  title="Close CLI Window"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* FLOATING CLI TERMINAL CONTENT */}
            {!t.minimized && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0c]">
                {/* Console Output Logs */}
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-emerald-400 select-text custom-scrollbar space-y-1">
                  {(terminalLogs[t.nodeId] || []).map((log, i) => (
                    <div key={i} className="whitespace-pre-wrap leading-relaxed">{log}</div>
                  ))}
                </div>

                {/* Console Input Form */}
                <form 
                  onSubmit={(e) => handleTerminalSubmit(e, t.nodeId)}
                  className="h-9 border-t border-slate-850 flex items-center flex-shrink-0 bg-[#050505] px-3"
                >
                  <span className="text-emerald-500 text-xs font-bold mr-1.5 font-mono">VRP&gt;</span>
                  <input 
                    type="text" 
                    value={terminalInputs[t.nodeId] || ""}
                    onChange={(e) => setTerminalInputs({ ...terminalInputs, [t.nodeId]: e.target.value })}
                    className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-white placeholder-slate-600"
                    placeholder="Type command (sys, display ip interface brief, ping)..."
                    autoFocus
                  />
                </form>
              </div>
            )}
          </div>
        );
      })}

      {/* ----------------------------------------------------
          INTERFACE SELECTION MODAL (Cabling Flow)
          ---------------------------------------------------- */}
      {showInterfaceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-white">
            <h3 className="text-sm font-bold text-white mb-1">Select Interface Port</h3>
            <p className="text-[11px] text-slate-400 mb-4">Choose port for copper ethernet cable connection.</p>
            
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {modalInterfaces.map(i => (
                <button
                  key={i}
                  onClick={() => selectInterface(i)}
                  className="bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white text-xs rounded-xl py-2 px-3 text-center border border-slate-700 font-mono transition-colors"
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

      {/* ----------------------------------------------------
          DEVICE QUICK SETTINGS MODAL
          ---------------------------------------------------- */}
      {showSettingsModal && settingsNodeId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings size={16} className="text-blue-400" /> 
                Device Settings: {nodes.find(n => n.id === settingsNodeId)?.name}
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
            </div>

            <div className="space-y-3 text-xs font-mono text-slate-300">
              {(() => {
                const node = nodes.find(n => n.id === settingsNodeId);
                if (!node) return null;
                const state = deviceStates[node.name] || {};

                return (
                  <>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-bold uppercase font-sans">Device Information</div>
                      <div className="mt-1">Hostname: <span className="text-white font-bold">{state.hostname}</span></div>
                      <div>Type: <span className="text-white font-bold">{node.type}</span></div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto custom-scrollbar">
                      <div className="text-[10px] text-slate-500 font-bold uppercase font-sans mb-1">Configured Interfaces</div>
                      {Object.entries(state.interfaces || {}).map(([intName, iData]) => (
                        <div key={intName} className="py-1 border-b border-slate-850 last:border-0">
                          <span className="text-blue-400 font-bold">{intName.replace("GigabitEthernet", "GE")}:</span>{" "}
                          {iData.ip ? `${iData.ip}/${iData.mask}` : "unassigned"}{" "}
                          {iData.shutdown ? "(SHUTDOWN)" : ""}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  openCliWindow(settingsNodeId);
                  setShowSettingsModal(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-4 py-2 text-xs font-bold transition-colors"
              >
                Open CLI Console
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full px-4 py-2 text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          SUBMISSION RESULTS MODAL
          ---------------------------------------------------- */}
      <AnimatePresence>
        {submissionResult && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 max-w-lg w-full flex flex-col max-h-[85vh] text-white"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  submissionResult.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                }`}>
                  {submissionResult.passed ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Lab Attempt Submission</h3>
                  <p className="text-[10px] text-slate-400">Grading results & verification check report</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Score</div>
                  <div className="text-2xl font-black text-white">{submissionResult.score}%</div>
                </div>
                <div className="text-center border-l border-slate-800">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Result</div>
                  <div className={`text-sm font-black mt-1 ${submissionResult.passed ? "text-emerald-400" : "text-rose-400"}`}>
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
                      isFail ? "bg-rose-950/20 border-rose-900/50 text-rose-200" : "bg-emerald-950/20 border-emerald-900/50 text-emerald-200"
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
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full py-2.5 text-xs font-bold transition-colors w-full shadow-lg"
              >
                Close & Return to Dashboard
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          BOTTOM eNSP STATUS BAR
          ---------------------------------------------------- */}
      <footer className="h-7 bg-slate-900 border-t border-slate-800 text-slate-400 text-[10px] px-3 flex items-center justify-between flex-shrink-0 z-30 font-mono">
        <div className="flex items-center gap-4">
          {/* Simulation engine status */}
          <span className="flex items-center gap-1.5 font-bold">
            <span className={`w-2 h-2 rounded-full ${isSimRunning ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            {isSimRunning ? "SIMULATION RUNNING" : "SIMULATION STOPPED"}
          </span>

          <span>Devices: {nodes.length}</span>
          <span>Cables: {links.length}</span>
          <span>Open CLIs: {openTerminals.length}</span>
        </div>

        <div className="flex items-center gap-4">
          <span>Grid: {showGrid ? "ON" : "OFF"}</span>
          <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
          <span className="text-slate-500 font-sans">Huawei eNSP Engine v2.0</span>
        </div>
      </footer>
    </div>
  );
}
