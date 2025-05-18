const express = require('express');
const { viewFlaggedTransactions, aggregateTotalUserBalances, viewTopUsers } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware'); // Admin routes should also be protected
const router = express.Router();

router.use(protect); // For simplicity, any logged-in user can access admin. Add role checks for real app.

router.get('/flagged-transactions', viewFlaggedTransactions);
router.get('/total-balances', aggregateTotalUserBalances);
router.get('/top-users/:criteria', viewTopUsers); // :criteria can be 'balance' or 'volume'

module.exports = router;