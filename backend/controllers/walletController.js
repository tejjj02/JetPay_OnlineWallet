const { v4: uuidv4 } = require('uuid');
const { readWallets, writeWallets, readTransactions, writeTransactions, readUsers } = require('../utils/fileUtils');
const { checkFraud } = require('../services/fraudServices');

const getBalance = async (req, res) => {
    const wallets = await readWallets();
    const wallet = wallets.find(w => w.userId === req.user.id);
    if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
    }
    res.json({ balance: wallet.balance, currency: wallet.currency });
};

const deposit = async (req, res) => {
    const { amount } = req.body;
    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
        return res.status(400).json({ message: 'Invalid deposit amount' });
    }

    let wallets = await readWallets();
    let wallet = wallets.find(w => w.userId === req.user.id);

    if (!wallet) { // Should not happen if wallet is created on registration
        return res.status(404).json({ message: 'Wallet not found' });
    }

    wallet.balance += depositAmount;
    await writeWallets(wallets);

    const transactions = await readTransactions();
    const newTransaction = {
        id: uuidv4(),
        userId: req.user.id, // For easier filtering of "my transactions"
        type: 'DEPOSIT',
        amount: depositAmount,
        timestamp: new Date().toISOString(),
        status: 'COMPLETED',
        description: `Deposit of ${depositAmount} INR`,
        isFlagged: false,
        flagReason: null
    };
    transactions.push(newTransaction);
    await writeTransactions(transactions);

    res.json({ message: 'Deposit successful', newBalance: wallet.balance });
};

const withdraw = async (req, res) => {
    const { amount } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }

    let wallets = await readWallets();
    let wallet = wallets.find(w => w.userId === req.user.id);

    if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
    }
    if (wallet.balance < withdrawAmount) {
        return res.status(400).json({ message: 'Insufficient funds' });
    }

    wallet.balance -= withdrawAmount;
    
    const transactions = await readTransactions();
    const newTransaction = {
        id: uuidv4(),
        userId: req.user.id,
        type: 'WITHDRAW',
        amount: withdrawAmount,
        timestamp: new Date().toISOString(),
        status: 'PENDING', // Mark pending until fraud check
        description: `Withdrawal of ${withdrawAmount} INR`,
        isFlagged: false,
        flagReason: null
    };
    
    const fraudCheckResult = await checkFraud(newTransaction); // Pass the transaction object
    if (fraudCheckResult.isFlagged) {
        newTransaction.isFlagged = true;
        newTransaction.flagReason = fraudCheckResult.flagReason;
        // For a real system, you might hold the transaction or require admin approval
        // For this demo, we'll log it and proceed, but mark it.
        console.warn(`FRAUD DETECTED (Withdrawal): ${newTransaction.flagReason} for user ${req.user.id}, amount ${withdrawAmount}`);
    }
    
    newTransaction.status = 'COMPLETED'; // Complete after check (can be more complex)
    transactions.push(newTransaction);
    
    await writeWallets(wallets); // Write wallet changes only if transaction is deemed okay or policy allows
    await writeTransactions(transactions);

    res.json({ message: 'Withdrawal successful', newBalance: wallet.balance, fraudStatus: newTransaction.isFlagged ? newTransaction.flagReason : "No fraud detected" });
};

const transfer = async (req, res) => {
    const { toUsername, amount } = req.body;
    const transferAmount = parseFloat(amount);

    if (!toUsername || isNaN(transferAmount) || transferAmount <= 0) {
        return res.status(400).json({ message: 'Invalid transfer details or amount' });
    }
    if (req.user.username === toUsername) {
        return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    let wallets = await readWallets();
    const users = await readUsers();

    const fromWallet = wallets.find(w => w.userId === req.user.id);
    const toUser = users.find(u => u.username === toUsername);

    if (!toUser) {
        return res.status(404).json({ message: 'Recipient user not found' });
    }
    let toWallet = wallets.find(w => w.userId === toUser.id);
    if (!toWallet) { // Should exist if user exists
        return res.status(404).json({ message: 'Recipient wallet not found' });
    }

    if (!fromWallet) {
        return res.status(404).json({ message: 'Sender wallet not found' });
    }
    if (fromWallet.balance < transferAmount) {
        return res.status(400).json({ message: 'Insufficient funds' });
    }
    // Prevent transferring more than 90% of balance
    if (transferAmount > fromWallet.balance * 0.9) {
        return res.status(400).json({ message: 'You cannot transfer more than 90% of your balance in a single transaction.' });
    }

    // Atomicity simulation for JSON files: perform operations, then write
    fromWallet.balance -= transferAmount;
    toWallet.balance += transferAmount;

    const transactions = await readTransactions();
    const newTransaction = {
        id: uuidv4(),
        type: 'TRANSFER',
        fromUserId: req.user.id,
        toUserId: toUser.id,
        amount: transferAmount,
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        description: `Transfer of ${transferAmount} INR to ${toUsername}`,
        isFlagged: false,
        flagReason: null
    };

    const fraudCheckResult = await checkFraud(newTransaction); // Pass the transaction object
     if (fraudCheckResult.isFlagged) {
        newTransaction.isFlagged = true;
        newTransaction.flagReason = fraudCheckResult.flagReason;
        console.warn(`FRAUD DETECTED (Transfer): ${newTransaction.flagReason} for user ${req.user.id} to ${toUsername}, amount ${transferAmount}`);
    }

    newTransaction.status = 'COMPLETED';
    transactions.push(newTransaction);

    try {
        await writeWallets(wallets); // Write all wallet changes
        await writeTransactions(transactions); // Write transaction log
        res.json({ message: 'Transfer successful', newBalance: fromWallet.balance, fraudStatus: newTransaction.isFlagged ? newTransaction.flagReason : "No fraud detected" });
    } catch (error) {
        // Basic rollback idea for JSON (not truly atomic)
        // This is complex with flat files. For now, log error.
        // In a real DB, a transaction would handle this.
        console.error("Error during transfer commit:", error);
        // Attempt to revert (might be risky if original data was already overwritten in memory)
        // For simplicity, we won't implement full JSON rollback here.
        res.status(500).json({ message: "Transfer failed during commit, data might be inconsistent." });
    }
};


const getTransactionHistory = async (req, res) => {
    const transactions = await readTransactions();
    const userTransactions = transactions.filter(
        t => t.userId === req.user.id || t.fromUserId === req.user.id || t.toUserId === req.user.id
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by newest first

    res.json(userTransactions);
};


module.exports = { getBalance, deposit, withdraw, transfer, getTransactionHistory };