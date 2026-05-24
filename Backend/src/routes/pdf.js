const express = require("express");
const multer = require("multer");
const store = require("../store");
const { authenticate, requireRole } = require("../middleware/auth");
const { ok, created, fail, asyncHandler } = require("../utils/http");

const upload = multer({ dest: "uploads/" });
const router = express.Router();

router.use(authenticate);

router.get("/", requireRole("admin"), (req, res) => {
  return ok(res, { pdfs: store.collection("pdfs") });
});

router.post("/upload", requireRole("admin"), upload.single("pdf"), asyncHandler(async (req, res) => {
  const pdf = await store.insert("pdfs", {
    filename: req.file ? req.file.filename : null,
    originalName: req.file ? req.file.originalname : req.body.originalName || req.body.title || "Untitled PDF",
    original_name: req.file ? req.file.originalname : req.body.originalName || req.body.title || "Untitled PDF",
    mimeType: req.file ? req.file.mimetype : "application/pdf",
    mime_type: req.file ? req.file.mimetype : "application/pdf",
    size: req.file ? req.file.size : 0,
    path: req.file ? req.file.path : null,
    uploadedBy: req.user.id,
    uploaded_by: req.user.id
  });

  return created(res, { pdf }, "PDF uploaded");
}));

router.get("/:id", requireRole("admin"), (req, res) => {
  const pdf = store.collection("pdfs").find((item) => item.id === req.params.id);
  if (!pdf) return fail(res, 404, "PDF not found");
  return ok(res, { pdf });
});

router.delete("/:id", requireRole("admin"), asyncHandler(async (req, res) => {
  const deleted = await store.remove("pdfs", req.params.id);
  if (!deleted) return fail(res, 404, "PDF not found");
  return ok(res, null, "PDF deleted");
}));

module.exports = router;
