function ok(res, data = null, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function created(res, data = null, message = "Created") {
  return ok(res, data, message, 201);
}

function fail(res, status, message, errors = null) {
  return res.status(status).json({ success: false, message, errors });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { ok, created, fail, asyncHandler };
