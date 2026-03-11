const express = require('express');
const router = express.Router();
const cgiController = require('../controllers/cgiController');
const dashController = require('../controllers/dashController');
const authMiddleware = require('../middleware/auth');

// Apply auth to all API routes
router.use(authMiddleware);

// CGI Workflow routes
router.post('/cgi/mvr-ontario', cgiController.mvrOntario);

// DASH Workflow routes
router.post('/dash/run-report', dashController.runReport);

module.exports = router;
