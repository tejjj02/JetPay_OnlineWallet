const express = require('express');
const { getBalance, deposit, withdraw, transfer, getTransactionHistory } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect); // Protect all wallet routes

router.get('/balance', getBalance);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);
router.post('/transfer', transfer);
router.get('/history', getTransactionHistory);

module.exports = router;