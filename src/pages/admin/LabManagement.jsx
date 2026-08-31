import { useState, useEffect } from "react";
import { 
  Terminal, ShieldAlert, Cpu, Server, Plus, Trash2, 
  UserPlus, UserMinus, FileText, CheckCircle, RefreshCw, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  listLabs, createLab, deleteLab, listLabEnrollments, 
  enrollInLab, unenrollFromLab, listLabAttempts, getLabAttempt, listStudents 
} from "../../services/api";

export default function LabManagement() {
  const [labs, setLabs] = useState([]);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAttemptsModal, setShowAttemptsModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Active items for modals
  const [selectedLab, setSelectedLab] = useState(null);
  const [assignedStudents, setAssignedStudents] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  // Form states for creating a lab
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [objective, setObjective] = useState("");
  
  // Custom Validation Rules state
  const [targetNodes, setTargetNodes] = useState([]); // { name, type }
  const [targetLinks, setTargetLinks] = useState([]); // { fromNode, fromInterface, toNode, toInterface }
  const [targetConfigs, setTargetConfigs] = useState({}); // deviceName -> { hostname, interfaces: { intName: { ip, mask, vlan } } }
  
  // Temporary fields for rule inputs
  const [tmpNodeName, setTmpNodeName] = useState("");
  const [tmpNodeType, setTmpNodeType] = useState("Router");
  
  const [tmpFromNode, setTmpFromNode] = useState("");
  const [tmpFromInt, setTmpFromInt] = useState("GigabitEthernet0/0/0");
  const [tmpToNode, setTmpToNode] = useState("");
  const [tmpToInt, setTmpToInt] = useState("GigabitEthernet0/0/0");

  const [tmpConfDevName, setTmpConfDevName] = useState("");
  const [tmpConfIntName, setTmpConfIntName] = useState("GigabitEthernet0/0/0");
  const [tmpConfIp, setTmpConfIp] = useState("");
  const [tmpConfMask, setTmpConfMask] = useState("24");
  const [tmpConfVlan, setTmpConfVlan] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const [labsRes, studentsData] = await Promise.all([
        listLabs(),
        listStudents()
      ]);
      setLabs(labsRes.labs || []);
      setStudents(studentsData.students || []);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to fetch dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------
  // LAB CRUD HANDLERS
  // ----------------------------------------------------
  const handleAddNodeRule = () => {
    if (!tmpNodeName.trim()) return;
    setTargetNodes([...targetNodes, { name: tmpNodeName.trim(), type: tmpNodeType }]);
    setTmpNodeName("");
  };

  const handleAddLinkRule = () => {
    if (!tmpFromNode.trim() || !tmpToNode.trim()) return;
    setTargetLinks([...targetLinks, {
      fromNode: tmpFromNode.trim(),
      fromInterface: tmpFromInt,
      toNode: tmpToNode.trim(),
      toInterface: tmpToInt
    }]);
    setTmpFromNode("");
    setTmpToNode("");
  };

  const handleAddConfigRule = () => {
    if (!tmpConfDevName.trim()) return;
    const dev = tmpConfDevName.trim();
    const currentDev = targetConfigs[dev] || { hostname: dev, interfaces: {} };
    
    if (tmpConfIp.trim()) {
      currentDev.interfaces[tmpConfIntName] = {
        ip: tmpConfIp.trim(),
        mask: tmpConfMask.trim(),
        vlan: tmpConfVlan.trim() ? Number(tmpConfVlan) : undefined
      };
    }

    setTargetConfigs({
      ...targetConfigs,
      [dev]: currentDev
    });
    setTmpConfDevName("");
    setTmpConfIp("");
    setTmpConfVlan("");
  };

  const clearCreateForm = () => {
    setTitle("");
    setDescription("");
    setDifficulty("medium");
    setObjective("");
    setTargetNodes([]);
    setTargetLinks([]);
    setTargetConfigs({});
  };

  const handleCreateLab = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setErrorMsg("");
      const payload = {
        title,
        description,
        difficulty,
        objective,
        initial_state: { nodes: [], links: [], deviceStates: {} },
        target_state: {
          nodes: targetNodes,
          links: targetLinks,
          configs: targetConfigs,
          passingScore: 70
        }
      };

      await createLab(payload);

      setSuccessMsg("Lab created successfully!");
      setShowCreateModal(false);
      clearCreateForm();
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to create lab.");
    }
  };

  const handleDeleteLab = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lab and all attempts?")) return;
    try {
      setErrorMsg("");
      await deleteLab(id);
      fetchData();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete lab.");
    }
  };

  // ----------------------------------------------------
  // ENROLLMENT (ASSIGNMENT) HANDLERS
  // ----------------------------------------------------
  const openAssignModal = async (labItem) => {
    setSelectedLab(labItem);
    try {
      setErrorMsg("");
      const res = await listLabEnrollments(labItem.id);
      setAssignedStudents(res.students || []);
      setShowAssignModal(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load lab assignments.");
    }
  };

  const assignStudent = async (studentId) => {
    if (!selectedLab) return;
    try {
      await enrollInLab(selectedLab.id, studentId);
      // Refresh enrollments list
      const res = await listLabEnrollments(selectedLab.id);
      setAssignedStudents(res.students || []);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to assign student.");
    }
  };

  const unassignStudent = async (studentId) => {
    if (!selectedLab) return;
    try {
      await unenrollFromLab(selectedLab.id, studentId);
      // Refresh enrollments list
      const res = await listLabEnrollments(selectedLab.id);
      setAssignedStudents(res.students || []);
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to remove student.");
    }
  };

  // ----------------------------------------------------
  // REVIEW ATTEMPTS HANDLERS
  // ----------------------------------------------------
  const openAttemptsModal = async (labItem) => {
    setSelectedLab(labItem);
    try {
      setErrorMsg("");
      const res = await listLabAttempts(labItem.id);
      setAttempts(res.attempts || []);
      setShowAttemptsModal(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load attempts list.");
    }
  };

  const openReviewModal = async (attempt) => {
    try {
      setErrorMsg("");
      const res = await getLabAttempt(attempt.id);
      setSelectedAttempt(res.attempt);
      setShowReviewModal(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load attempt details.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-2">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">eNSP Simulator Labs</h1>
          <p className="text-xs text-slate-500">Create topology labs, assign them to students, and grade network configurations.</p>
        </div>
        <button 
          onClick={() => { clearCreateForm(); setShowCreateModal(true); }}
          className="bg-gray-900 hover:bg-black text-white text-xs font-bold py-2.5 px-4 rounded-full flex items-center gap-1.5 transition-colors"
        >
          <Plus size={14} /> Create New Lab
        </button>
      </div>

      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs px-4 py-3 rounded-2xl flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-500 font-bold">Close</button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 bg-red-50 border border-red-100 text-red-800 text-xs px-4 py-3 rounded-2xl flex justify-between items-center">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="text-red-500 font-bold">Close</button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="animate-spin h-8 w-8 text-slate-900" />
        </div>
      ) : labs.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">No Network Labs Created</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Start by adding a new simulation lab definition with configurations checking rules.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {labs.map(l => (
            <div key={l.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    l.difficulty === "easy" ? "bg-green-50 text-green-700" :
                    l.difficulty === "hard" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                  }`}>
                    {l.difficulty}
                  </span>
                  <button 
                    onClick={() => handleDeleteLab(l.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2 leading-tight">{l.title}</h3>
                <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">{l.description || "No description provided."}</p>
              </div>

              <div className="space-y-2 border-t border-slate-50 pt-3">
                <button
                  onClick={() => openAssignModal(l)}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <UserPlus size={12} /> Assign Students
                </button>
                <button
                  onClick={() => openAttemptsModal(l)}
                  className="w-full bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <FileText size={12} /> View Attempt Results
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ----------------------------------------------------
          MODAL: CREATE LAB
          ---------------------------------------------------- */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <h2 className="text-base font-bold text-slate-900">Define New eNSP Network Lab</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-900"><X size={18} /></button>
              </div>

              <form onSubmit={handleCreateLab} className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs select-text custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lab Title</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder="e.g. Basic OSPF Routing"
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-500 bg-slate-50/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Difficulty</label>
                    <select 
                      value={difficulty} 
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-500 bg-slate-50/50"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Short Description</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description printed on the card..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-500 bg-slate-50/50 h-16"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Objective / Instructions (Markdown supported)</label>
                  <textarea 
                    value={objective} 
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="Describe step-by-step goals: e.g. Configure Router1 G0/0/0 with 192.168.1.1..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-slate-500 bg-slate-50/50 h-28 font-sans"
                  />
                </div>

                {/* Validation Checker Configuration */}
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-[11px] font-bold text-slate-900 mb-3 flex items-center gap-1">🛠️ Grading Criteria Rules Checker</h3>
                  
                  {/* Rule type 1: Node exists */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-3">
                    <div className="font-bold text-[10px] text-slate-600 mb-2">1. Expected Devices Rules</div>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        value={tmpNodeName} 
                        onChange={(e) => setTmpNodeName(e.target.value)}
                        placeholder="Device Name (e.g. Router1)"
                        className="flex-1 p-2 border border-slate-200 rounded-xl text-xs outline-none bg-white"
                      />
                      <select 
                        value={tmpNodeType} 
                        onChange={(e) => setTmpNodeType(e.target.value)}
                        className="p-2 border border-slate-200 rounded-xl text-xs outline-none bg-white"
                      >
                        <option value="Router">Router</option>
                        <option value="Switch">Switch</option>
                        <option value="PC">PC</option>
                      </select>
                      <button 
                        type="button" 
                        onClick={handleAddNodeRule}
                        className="bg-slate-900 text-white text-[10px] font-bold px-3.5 rounded-xl"
                      >
                        Add Rule
                      </button>
                    </div>
                    {targetNodes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {targetNodes.map((n, i) => (
                          <span key={i} className="bg-white border border-slate-200 px-2 py-0.5 rounded-full text-[9px] flex items-center gap-1 font-semibold text-slate-700">
                            {n.name} ({n.type})
                            <button type="button" onClick={() => setTargetNodes(targetNodes.filter((_, idx) => idx !== i))} className="text-red-500 font-bold">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rule type 2: Link connections */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-3">
                    <div className="font-bold text-[10px] text-slate-600 mb-2">2. Expected Cables Connection Rules</div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="flex gap-1">
                        <input type="text" value={tmpFromNode} onChange={e => setTmpFromNode(e.target.value)} placeholder="From Dev (e.g. Router1)" className="w-1/2 p-2 border border-slate-200 rounded-xl text-xs bg-white" />
                        <select value={tmpFromInt} onChange={e => setTmpFromInt(e.target.value)} className="w-1/2 p-2 border border-slate-200 rounded-xl text-[10px] bg-white">
                          <option value="GigabitEthernet0/0/0">GE0/0/0</option>
                          <option value="GigabitEthernet0/0/1">GE0/0/1</option>
                          <option value="GigabitEthernet0/0/2">GE0/0/2</option>
                          <option value="Ethernet0/0/1">Eth0/0/1</option>
                        </select>
                      </div>
                      <div className="flex gap-1">
                        <input type="text" value={tmpToNode} onChange={e => setTmpToNode(e.target.value)} placeholder="To Dev (e.g. Switch1)" className="w-1/2 p-2 border border-slate-200 rounded-xl text-xs bg-white" />
                        <select value={tmpToInt} onChange={e => setTmpToInt(e.target.value)} className="w-1/2 p-2 border border-slate-200 rounded-xl text-[10px] bg-white">
                          <option value="GigabitEthernet0/0/1">GE0/0/1</option>
                          <option value="GigabitEthernet0/0/2">GE0/0/2</option>
                          <option value="GigabitEthernet0/0/3">GE0/0/3</option>
                          <option value="Ethernet0/0/1">Eth0/0/1</option>
                        </select>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={handleAddLinkRule}
                      className="w-full bg-slate-900 text-white text-[10px] font-bold py-1.5 rounded-xl mt-1"
                    >
                      Add Connection Cable Rule
                    </button>
                    {targetLinks.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-3">
                        {targetLinks.map((l, i) => (
                          <div key={i} className="bg-white border border-slate-200 px-3 py-1 rounded-xl text-[9px] flex justify-between items-center text-slate-700">
                            <span>Link: <b>{l.fromNode}</b> ({l.fromInterface.replace("GigabitEthernet", "GE")}) ↔ <b>{l.toNode}</b> ({l.toInterface.replace("GigabitEthernet", "GE")})</span>
                            <button type="button" onClick={() => setTargetLinks(targetLinks.filter((_, idx) => idx !== i))} className="text-red-500 font-bold">Delete</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rule type 3: Config settings */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="font-bold text-[10px] text-slate-600 mb-2">3. Expected Interface IP / VLAN Parameters</div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input type="text" value={tmpConfDevName} onChange={e => setTmpConfDevName(e.target.value)} placeholder="Device Name (e.g. Router1)" className="p-2 border border-slate-200 rounded-xl text-xs bg-white" />
                      <select value={tmpConfIntName} onChange={e => setTmpConfIntName(e.target.value)} className="p-2 border border-slate-200 rounded-xl text-[10px] bg-white">
                        <option value="GigabitEthernet0/0/0">GE0/0/0</option>
                        <option value="GigabitEthernet0/0/1">GE0/0/1</option>
                        <option value="GigabitEthernet0/0/2">GE0/0/2</option>
                        <option value="Ethernet0/0/1">Eth0/0/1</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <input type="text" value={tmpConfIp} onChange={e => setTmpConfIp(e.target.value)} placeholder="IP (e.g. 192.168.1.1)" className="p-2 border border-slate-200 rounded-xl text-xs bg-white" />
                      <input type="text" value={tmpConfMask} onChange={e => setTmpConfMask(e.target.value)} placeholder="Mask (e.g. 24)" className="p-2 border border-slate-200 rounded-xl text-xs bg-white" />
                      <input type="text" value={tmpConfVlan} onChange={e => setTmpConfVlan(e.target.value)} placeholder="VLAN ID" className="p-2 border border-slate-200 rounded-xl text-xs bg-white" />
                    </div>
                    <button 
                      type="button" 
                      onClick={handleAddConfigRule}
                      className="w-full bg-slate-900 text-white text-[10px] font-bold py-1.5 rounded-xl mt-1"
                    >
                      Add Configuration Parameter Rule
                    </button>
                    {Object.keys(targetConfigs).length > 0 && (
                      <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                        {Object.entries(targetConfigs).map(([dev, config]) => (
                          <div key={dev} className="border-b border-slate-100 last:border-0 pb-1.5 last:pb-0 text-[10px]">
                            <div className="font-bold text-slate-800">{dev} Hostname</div>
                            {Object.entries(config.interfaces || {}).map(([intName, details]) => (
                              <div key={intName} className="text-slate-500 pl-2">
                                • {intName.replace("GigabitEthernet", "GE")}: {details.ip}/{details.mask} {details.vlan ? `(VLAN ${details.vlan})` : ""}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-full text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-full text-xs font-bold transition-colors"
                  >
                    Save Lab
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          MODAL: ASSIGN STUDENTS
          ---------------------------------------------------- */}
      <AnimatePresence>
        {showAssignModal && selectedLab && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 max-w-md w-full flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Assign Lab - {selectedLab.title}</h2>
                  <p className="text-[10px] text-slate-400">Enroll or revoke students for this lab.</p>
                </div>
                <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-900"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 select-text custom-scrollbar">
                {students.map(student => {
                  const isAssigned = assignedStudents.some(e => e.id === student.id);
                  return (
                    <div key={student.id} className="p-3 rounded-2xl border border-slate-100 flex justify-between items-center bg-slate-55/30">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{student.surname}</div>
                        <div className="text-[9px] text-slate-400">Matric: {student.matricNumber} | Track: {student.track || "N/A"}</div>
                      </div>
                      
                      <button
                        onClick={() => isAssigned ? unassignStudent(student.id) : assignStudent(student.id)}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase transition-colors ${
                          isAssigned 
                            ? "bg-red-50 text-red-600 hover:bg-red-100" 
                            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        }`}
                      >
                        {isAssigned ? "Revoke" : "Assign"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          MODAL: VIEW ATTEMPTS LIST
          ---------------------------------------------------- */}
      <AnimatePresence>
        {showAttemptsModal && selectedLab && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 max-w-lg w-full flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Student Attempts - {selectedLab.title}</h2>
                  <p className="text-[10px] text-slate-400">Review student network configuration logs.</p>
                </div>
                <button onClick={() => setShowAttemptsModal(false)} className="text-slate-400 hover:text-slate-900"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 select-text custom-scrollbar">
                {attempts.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400">No submissions received for this lab yet.</div>
                ) : (
                  attempts.map(att => (
                    <div key={att.id} className="p-3.5 rounded-2xl border border-slate-100 flex justify-between items-center bg-slate-50/40">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{att.student?.surname}</div>
                        <div className="text-[9px] text-slate-400">Submitted: {new Date(att.submittedAt).toLocaleString()}</div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`text-xs font-black ${att.passed ? "text-emerald-600" : "text-red-500"}`}>{att.score}%</span>
                          <div className="text-[8px] text-slate-400 font-bold uppercase">{att.passed ? "Passed" : "Needs Review"}</div>
                        </div>
                        <button
                          onClick={() => openReviewModal(att)}
                          className="bg-slate-900 text-white text-[9px] font-bold uppercase rounded-full px-3 py-1.5 hover:bg-black transition-colors"
                        >
                          Review Layout
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          MODAL: REVIEW SINGLE ATTEMPT DETAILED CONFIGS
          ---------------------------------------------------- */}
      <AnimatePresence>
        {showReviewModal && selectedAttempt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 max-w-2xl w-full flex flex-col max-h-[85vh] text-slate-200"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4 flex-shrink-0">
                <div>
                  <h2 className="text-sm font-bold text-white">Grader Review: {selectedAttempt.student?.surname}</h2>
                  <p className="text-[9px] text-slate-400">Matric: {selectedAttempt.student?.matricNumber} | Lab: {selectedAttempt.lab?.title}</p>
                </div>
                <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-mono select-text custom-scrollbar">
                {/* Score panel */}
                <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-sans">Final Score</span>
                    <div className="text-xl font-bold text-white mt-0.5">{selectedAttempt.score}%</div>
                  </div>
                  <div className="text-center border-l border-slate-800">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-sans">Verification Status</span>
                    <div className={`text-xs font-bold mt-1 ${selectedAttempt.passed ? "text-emerald-400" : "text-red-400"}`}>
                      {selectedAttempt.passed ? "PASSED" : "FAILED"}
                    </div>
                  </div>
                </div>

                {/* Validation checks */}
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">Grading checks list:</div>
                  <div className="space-y-1.5">
                    {(selectedAttempt.checks || []).map((check, idx) => {
                      const isFail = check.toLowerCase().includes("failed");
                      return (
                        <div key={idx} className={`p-2 rounded-xl text-[10px] leading-relaxed border ${
                          isFail ? "bg-red-950/20 border-red-900/50 text-red-200" : "bg-emerald-950/20 border-emerald-900/50 text-emerald-200"
                        }`}>
                          {isFail ? "❌" : "✅"} {check}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Student Configured Devices */}
                <div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-sans">Active Configuration States:</div>
                  <div className="space-y-3">
                    {Object.entries(selectedAttempt.configs || {}).map(([devName, cfg]) => (
                      <div key={devName} className="bg-slate-950 rounded-2xl border border-slate-800 p-3.5">
                        <div className="text-xs font-bold text-white border-b border-slate-800 pb-1.5 mb-2 flex items-center gap-1.5">
                          <Terminal size={12} className="text-indigo-400" />
                          Device: {devName} (Hostname: {cfg.hostname})
                        </div>
                        
                        {/* Interfaces */}
                        <div className="mb-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase font-sans">Configured Interfaces:</span>
                          <div className="pl-3 mt-1 space-y-0.5 text-[10px]">
                            {Object.entries(cfg.interfaces || {}).map(([intName, iData]) => (
                              <div key={intName} className="text-slate-300">
                                <span className="font-semibold text-slate-400">{intName.replace("GigabitEthernet", "GE")}:</span>{" "}
                                {iData.ip ? `${iData.ip}/${iData.mask}` : "unassigned"}{" "}
                                {iData.shutdown ? "(SHUTDOWN)" : ""}{" "}
                                {iData.vlan ? `[VLAN ${iData.vlan}]` : ""}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* OSPF info if any */}
                        {cfg.ospf?.processId && (
                          <div className="mb-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase font-sans">OSPF Configurations:</span>
                            <div className="pl-3 mt-1 text-[10px] text-slate-300">
                              OSPF Process: {cfg.ospf.processId}
                              {(cfg.ospf.networks || []).map((net, nIdx) => (
                                <div key={nIdx} className="pl-2">• Network {net.ip} {net.wildcard} (Area {net.area})</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Static routing if any */}
                        {cfg.staticRoutes && cfg.staticRoutes.length > 0 && (
                          <div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase font-sans">Static Routes:</span>
                            <div className="pl-3 mt-1 text-[10px] text-slate-300">
                              {cfg.staticRoutes.map((route, rIdx) => (
                                <div key={rIdx}>• IP Route to {route.dest}/{route.mask} via {route.nexthop}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end flex-shrink-0">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-2 px-5 text-xs font-bold transition-colors"
                >
                  Close Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
