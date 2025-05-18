const { readTransactions, writeTransactions } = require('../utils/fileUtils');

const FRAUD_RULES = {
    MULTIPLE_TRANSFERS_SHORT_PERIOD: {
        TIME_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
        MAX_TRANSFERS: 3,
    },
    SUDDEN_LARGE_WITHDRAWAL: {
        THRESHOLD_AMOUNT: 5000, // Example threshold
    },
};

const checkFraud = async (transaction) => {
    const allTransactions = await readTransactions();
    let isFlagged = false;
    let flagReason = null;

    // Rule 1: Multiple transfers in a short period
    if (transaction.type === 'TRANSFER') {
        const recentUserTransfers = allTransactions.filter(
            (t) =>
                t.fromUserId === transaction.fromUserId &&
                t.type === 'TRANSFER' &&
                t.status === 'COMPLETED' && // Only count completed ones for this rule
                (new Date(transaction.timestamp).getTime() - new Date(t.timestamp).getTime()) < FRAUD_RULES.MULTIPLE_TRANSFERS_SHORT_PERIOD.TIME_WINDOW_MS
        );
        if (recentUserTransfers.length >= FRAUD_RULES.MULTIPLE_TRANSFERS_SHORT_PERIOD.MAX_TRANSFERS) {
            isFlagged = true;
            flagReason = 'Multiple transfers in a short period';
        }
    }

    // Rule 2: Sudden large withdrawal
    if (transaction.type === 'WITHDRAW' && transaction.amount > FRAUD_RULES.SUDDEN_LARGE_WITHDRAWAL.THRESHOLD_AMOUNT) {
        isFlagged = true;
        flagReason = flagReason ? `${flagReason}; Sudden large withdrawal` : 'Sudden large withdrawal';
    }
    
    // If a new transaction is flagged, update it in the main list before writing
    if (isFlagged) {
        transaction.isFlagged = true;
        transaction.flagReason = flagReason;
        console.log(`Transaction ${transaction.id} flagged for: ${flagReason}`);
        // The transaction will be saved with these flags by the controller
    }
    return { isFlagged, flagReason };
};


const getFlaggedTransactions = async () => {
    const transactions = await readTransactions();
    return transactions.filter(t => t.isFlagged);
};

module.exports = {
    checkFraud,
    getFlaggedTransactions
};