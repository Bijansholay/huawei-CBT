const express = require("express");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { ok, created, fail, asyncHandler } = require("../utils/http");

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ----------------------------------------------------
// GRADER UTILITY
// ----------------------------------------------------
function gradeLab(submittedTopology, submittedConfigs, targetState) {
  if (!targetState || Object.keys(targetState).length === 0) {
    return { score: 100, passed: true, checks: ["No specific grading criteria required. Auto-pass."] };
  }

  let totalPoints = 0;
  let earnedPoints = 0;
  const checks = [];

  const studentNodes = submittedTopology.nodes || [];
  const studentLinks = submittedTopology.links || [];

  // ------------------------------------------------------------------
  // BUILD A FLEXIBLE TARGET-NAME → STUDENT-NODE MAPPING
  // This resolves the mismatch when the target says "Router1" but the
  // student's canvas node is "AR22201" (because they picked the AR2220
  // model from the palette).  We try three strategies in priority order:
  //   1. Exact canvas-name match   (Router1 ↔ Router1)
  //   2. Hostname match            (target "Router1" ↔ student hostname "Router1")
  //   3. Type-based fallback       (match unmatched target Router to unmatched student Router)
  // ------------------------------------------------------------------
  const targetNodes = targetState.nodes || [];
  // Map: targetNodeName (lower) → student node object
  const nameMap = {};
  const usedStudentIds = new Set();

  // Pass 1 – exact canvas-name match
  for (const tn of targetNodes) {
    const match = studentNodes.find(
      sn => !usedStudentIds.has(sn.id) &&
            String(sn.name).toLowerCase() === String(tn.name).toLowerCase() &&
            sn.type === tn.type
    );
    if (match) {
      nameMap[tn.name.toLowerCase()] = match;
      usedStudentIds.add(match.id);
    }
  }

  // Pass 2 – match by hostname stored in submitted configs
  for (const tn of targetNodes) {
    if (nameMap[tn.name.toLowerCase()]) continue; // already matched
    for (const sn of studentNodes) {
      if (usedStudentIds.has(sn.id) || sn.type !== tn.type) continue;
      const cfg = submittedConfigs[sn.name];
      if (cfg && String(cfg.hostname || "").toLowerCase() === String(tn.name).toLowerCase()) {
        nameMap[tn.name.toLowerCase()] = sn;
        usedStudentIds.add(sn.id);
        break;
      }
    }
  }

  // Pass 2b – match by target config hostname (if target has configs with a hostname expectation)
  if (targetState.configs) {
    for (const tn of targetNodes) {
      if (nameMap[tn.name.toLowerCase()]) continue;
      const targetCfg = targetState.configs[tn.name];
      if (!targetCfg || !targetCfg.hostname) continue;
      for (const sn of studentNodes) {
        if (usedStudentIds.has(sn.id) || sn.type !== tn.type) continue;
        const cfg = submittedConfigs[sn.name];
        if (cfg && String(cfg.hostname || "").toLowerCase() === String(targetCfg.hostname).toLowerCase()) {
          nameMap[tn.name.toLowerCase()] = sn;
          usedStudentIds.add(sn.id);
          break;
        }
      }
    }
  }

  // Pass 3 – type-based positional fallback (match remaining by same type)
  for (const tn of targetNodes) {
    if (nameMap[tn.name.toLowerCase()]) continue;
    const match = studentNodes.find(
      sn => !usedStudentIds.has(sn.id) && sn.type === tn.type
    );
    if (match) {
      nameMap[tn.name.toLowerCase()] = match;
      usedStudentIds.add(match.id);
    }
  }

  // Helper to resolve a target node name to the student canvas node name
  function resolveStudentName(targetName) {
    const mapped = nameMap[String(targetName).toLowerCase()];
    return mapped ? mapped.name : null;
  }
  function resolveStudentNode(targetName) {
    return nameMap[String(targetName).toLowerCase()] || null;
  }

  // ------------------------------------------------------------------
  // 1. VALIDATE NODES (Weight: 20%)
  // ------------------------------------------------------------------
  for (const tn of targetNodes) {
    totalPoints += 10;
    if (resolveStudentNode(tn.name)) {
      earnedPoints += 10;
      checks.push(`Node check passed: ${tn.name} (${tn.type}) exists`);
    } else {
      checks.push(`Node check failed: Expected node ${tn.name} (${tn.type}) not found`);
    }
  }

  // ------------------------------------------------------------------
  // 2. VALIDATE WIRES / LINKS (Weight: 20%)
  // ------------------------------------------------------------------
  if (targetState.links && Array.isArray(targetState.links)) {
    targetState.links.forEach(targetLink => {
      totalPoints += 10;

      // Resolve target names to student canvas node IDs
      const fromStudent = resolveStudentNode(targetLink.fromNode);
      const toStudent = resolveStudentNode(targetLink.toNode);

      if (!fromStudent || !toStudent) {
        checks.push(`Link check failed: Expected link between ${targetLink.fromNode} (${targetLink.fromInterface}) and ${targetLink.toNode} (${targetLink.toInterface})`);
        return;
      }

      const matchedLink = studentLinks.find(l => {
        const dirMatch =
          (l.fromNodeId === fromStudent.id &&
            l.fromInterface.toLowerCase() === targetLink.fromInterface.toLowerCase() &&
            l.toNodeId === toStudent.id &&
            l.toInterface.toLowerCase() === targetLink.toInterface.toLowerCase()) ||
          (l.toNodeId === fromStudent.id &&
            l.toInterface.toLowerCase() === targetLink.fromInterface.toLowerCase() &&
            l.fromNodeId === toStudent.id &&
            l.fromInterface.toLowerCase() === targetLink.toInterface.toLowerCase());
        return dirMatch;
      });

      if (matchedLink) {
        earnedPoints += 10;
        checks.push(`Link check passed: Connected ${targetLink.fromNode} (${targetLink.fromInterface}) to ${targetLink.toNode} (${targetLink.toInterface})`);
      } else {
        checks.push(`Link check failed: Expected link between ${targetLink.fromNode} (${targetLink.fromInterface}) and ${targetLink.toNode} (${targetLink.toInterface})`);
      }
    });
  }

  // ------------------------------------------------------------------
  // 3. VALIDATE CONFIGURATIONS (Weight: 60%)
  // ------------------------------------------------------------------
  if (targetState.configs && typeof targetState.configs === "object") {
    for (const [deviceName, deviceTargets] of Object.entries(targetState.configs)) {
      // Look up the student's config using the resolved name mapping
      const studentName = resolveStudentName(deviceName) || deviceName;
      const deviceConfig = submittedConfigs[studentName] || submittedConfigs[deviceName] || {};

      // Check Hostname
      if (deviceTargets.hostname) {
        totalPoints += 5;
        if (String(deviceConfig.hostname || "").toLowerCase() === String(deviceTargets.hostname).toLowerCase()) {
          earnedPoints += 5;
          checks.push(`Config check passed: ${deviceName} hostname is set to ${deviceTargets.hostname}`);
        } else {
          checks.push(`Config check failed: Expected ${deviceName} hostname to be ${deviceTargets.hostname}`);
        }
      }

      // Check Interfaces
      if (deviceTargets.interfaces && typeof deviceTargets.interfaces === "object") {
        for (const [intName, intTarget] of Object.entries(deviceTargets.interfaces)) {
          const intConfig = (deviceConfig.interfaces || {})[intName] || {};

          // Check IP address
          if (intTarget.ip) {
            totalPoints += 15;
            if (intConfig.ip === intTarget.ip && String(intConfig.mask) === String(intTarget.mask)) {
              earnedPoints += 15;
              checks.push(`Config check passed: ${deviceName} interface ${intName} configured with ${intTarget.ip}/${intTarget.mask}`);
            } else {
              checks.push(`Config check failed: Expected ${deviceName} interface ${intName} configured with ${intTarget.ip}/${intTarget.mask}`);
            }
          }

          // Check VLAN assign
          if (intTarget.vlan) {
            totalPoints += 10;
            if (Number(intConfig.vlan) === Number(intTarget.vlan)) {
              earnedPoints += 10;
              checks.push(`Config check passed: ${deviceName} interface ${intName} assigned to VLAN ${intTarget.vlan}`);
            } else {
              checks.push(`Config check failed: Expected ${deviceName} interface ${intName} assigned to VLAN ${intTarget.vlan}`);
            }
          }
        }
      }

      // Check OSPF Configuration
      if (deviceTargets.ospf) {
        totalPoints += 15;
        const ospfConfig = deviceConfig.ospf || {};
        const expectedNetworks = deviceTargets.ospf.networks || [];
        
        let allNetsMatch = expectedNetworks.length > 0;
        expectedNetworks.forEach(targetNet => {
          const netExists = (ospfConfig.networks || []).some(
            n => n.ip === targetNet.ip && n.wildcard === targetNet.wildcard
          );
          if (!netExists) allNetsMatch = false;
        });

        if (allNetsMatch) {
          earnedPoints += 15;
          checks.push(`Config check passed: OSPF enabled on ${deviceName} with correct network statements`);
        } else {
          checks.push(`Config check failed: Expected OSPF network configurations on ${deviceName}`);
        }
      }
    }
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 100;
  const passingScore = targetState.passingScore || 70;
  const passed = score >= passingScore;

  return { score, passed, checks };
}

// ----------------------------------------------------
// LAB CRUD ROUTES (Admin only)
// ----------------------------------------------------

router.get("/", asyncHandler(async (req, res) => {
  const allLabs = store.collection("labs");
  if (req.user.role === "admin") {
    // Admins see all labs
    return ok(res, { labs: allLabs });
  } else {
    // Students see only enrolled labs
    const enrollments = store.collection("labEnrollments").filter(e => e.studentId === req.user.id);
    const enrolledLabIds = enrollments.map(e => e.labId);
    const studentLabs = allLabs.filter(lab => enrolledLabIds.includes(lab.id));
    
    // Also attach completion/attempt stats
    const studentAttempts = store.collection("labAttempts").filter(a => a.studentId === req.user.id);
    const labsWithStats = studentLabs.map(lab => {
      const attempts = studentAttempts.filter(a => a.labId === lab.id);
      const bestAttempt = attempts.reduce((best, curr) => (curr.score > best.score ? curr : best), { score: 0, passed: false });
      return {
        ...lab,
        attemptsCount: attempts.length,
        bestScore: bestAttempt.score,
        passed: bestAttempt.passed
      };
    });

    return ok(res, { labs: labsWithStats });
  }
}));

router.post("/", requireRole("admin"), asyncHandler(async (req, res) => {
  const { title, description, difficulty, objective, initial_state, target_state } = req.body;
  if (!title) return fail(res, 400, "Lab title is required");

  const lab = await store.insert("labs", {
    title,
    description: description || "",
    difficulty: difficulty || "medium",
    objective: objective || "",
    initialState: initial_state || {},
    targetState: target_state || {}
  });

  return created(res, { lab }, "Lab created successfully");
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const lab = store.collection("labs").find(l => l.id === req.params.id);
  if (!lab) return fail(res, 404, "Lab not found");

  if (req.user.role !== "admin") {
    // Verify enrollment
    const enrolled = store.collection("labEnrollments").some(e => e.labId === lab.id && e.studentId === req.user.id);
    if (!enrolled) return fail(res, 403, "You are not enrolled in this lab");
  }

  return ok(res, { lab });
}));

router.put("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const lab = store.collection("labs").find(l => l.id === req.params.id);
  if (!lab) return fail(res, 404, "Lab not found");

  const patch = {};
  ["title", "description", "difficulty", "objective", "initial_state", "target_state"].forEach(field => {
    if (req.body[field] !== undefined) {
      if (field === "initial_state") patch.initialState = req.body[field];
      else if (field === "target_state") patch.targetState = req.body[field];
      else patch[field] = req.body[field];
    }
  });

  const updated = await store.update("labs", req.params.id, patch);
  return ok(res, { lab: updated }, "Lab updated successfully");
}));

router.delete("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const deleted = await store.remove("labs", req.params.id);
  if (!deleted) return fail(res, 404, "Lab not found");

  // Cleanup enrollments and attempts
  const enrollments = store.collection("labEnrollments").filter(e => e.labId === req.params.id);
  for (const e of enrollments) {
    await store.remove("labEnrollments", e.id);
  }
  const attempts = store.collection("labAttempts").filter(a => a.labId === req.params.id);
  for (const a of attempts) {
    await store.remove("labAttempts", a.id);
  }

  return ok(res, null, "Lab deleted successfully");
}));

// ----------------------------------------------------
// LAB ENROLLMENTS ROUTES (Admin only)
// ----------------------------------------------------

router.get("/:id/enrollments", requireRole("admin"), asyncHandler(async (req, res) => {
  const lab = store.collection("labs").find(l => l.id === req.params.id);
  if (!lab) return fail(res, 404, "Lab not found");

  const enrollments = store.collection("labEnrollments").filter(e => e.labId === lab.id);
  const students = enrollments.map(e => {
    const student = store.collection("users").find(u => u.id === e.studentId);
    return {
      enrollmentId: e.id,
      ...store.withoutSecrets(student)
    };
  });

  return ok(res, { students });
}));

router.post("/:id/enroll", requireRole("admin"), asyncHandler(async (req, res) => {
  const lab = store.collection("labs").find(l => l.id === req.params.id);
  if (!lab) return fail(res, 404, "Lab not found");

  const { studentId, student_id } = req.body;
  const resolvedStudentId = studentId || student_id;
  if (!resolvedStudentId) return fail(res, 400, "studentId is required");

  const student = store.collection("users").find(u => u.id === resolvedStudentId && u.role === "student");
  if (!student) return fail(res, 404, "Student not found");

  const exists = store.collection("labEnrollments").some(e => e.labId === lab.id && e.studentId === student.id);
  if (exists) return fail(res, 409, "Student is already assigned to this lab");

  const enrollment = await store.insert("labEnrollments", {
    labId: lab.id,
    studentId: student.id
  });

  return created(res, { enrollment }, "Student assigned to lab");
}));

router.post("/:id/unenroll", requireRole("admin"), asyncHandler(async (req, res) => {
  const lab = store.collection("labs").find(l => l.id === req.params.id);
  if (!lab) return fail(res, 404, "Lab not found");

  const { studentId, student_id } = req.body;
  const resolvedStudentId = studentId || student_id;
  if (!resolvedStudentId) return fail(res, 400, "studentId is required");

  const enrollment = store.collection("labEnrollments").find(e => e.labId === lab.id && e.studentId === resolvedStudentId);
  if (!enrollment) return fail(res, 404, "Assignment not found");

  await store.remove("labEnrollments", enrollment.id);
  return ok(res, null, "Student assignment removed");
}));

// ----------------------------------------------------
// LAB SUBMISSION & ATTEMPT ROUTES
// ----------------------------------------------------

router.post("/:id/submit", requireRole("student"), asyncHandler(async (req, res) => {
  const lab = store.collection("labs").find(l => l.id === req.params.id);
  if (!lab) return fail(res, 404, "Lab not found");

  // Verify enrollment
  const enrolled = store.collection("labEnrollments").some(e => e.labId === lab.id && e.studentId === req.user.id);
  if (!enrolled) return fail(res, 403, "You are not enrolled in this lab");

  const { topology, configs } = req.body;
  if (!topology || !configs) return fail(res, 400, "topology and configs are required");

  // Run validation
  const { score, passed, checks } = gradeLab(topology, configs, lab.targetState);

  const attempt = await store.insert("labAttempts", {
    labId: lab.id,
    studentId: req.user.id,
    score,
    passed,
    topology,
    configs,
    submittedAt: new Date().toISOString()
  });

  return created(res, { attempt: { ...attempt, checks } }, "Lab submitted successfully");
}));

router.get("/:id/attempts", asyncHandler(async (req, res) => {
  const lab = store.collection("labs").find(l => l.id === req.params.id);
  if (!lab) return fail(res, 404, "Lab not found");

  let attempts = store.collection("labAttempts").filter(a => a.labId === lab.id);
  if (req.user.role !== "admin") {
    // Students only see their own attempts
    attempts = attempts.filter(a => a.studentId === req.user.id);
  }

  const detailedAttempts = attempts.map(a => {
    const student = store.collection("users").find(u => u.id === a.studentId);
    return {
      ...a,
      student: store.withoutSecrets(student)
    };
  }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  return ok(res, { attempts: detailedAttempts });
}));

router.get("/attempts/:attemptId", asyncHandler(async (req, res) => {
  const attempt = store.collection("labAttempts").find(a => a.id === req.params.attemptId);
  if (!attempt) return fail(res, 404, "Attempt not found");

  const lab = store.collection("labs").find(l => l.id === attempt.labId);
  if (!lab) return fail(res, 404, "Lab not found");

  if (req.user.role !== "admin" && attempt.studentId !== req.user.id) {
    return fail(res, 403, "Access denied to this attempt");
  }

  const student = store.collection("users").find(u => u.id === attempt.studentId);
  
  // Re-run checks to provide details
  const { checks } = gradeLab(attempt.topology, attempt.configs, lab.targetState);

  return ok(res, {
    attempt: {
      ...attempt,
      checks,
      lab,
      student: store.withoutSecrets(student)
    }
  });
}));

module.exports = router;
