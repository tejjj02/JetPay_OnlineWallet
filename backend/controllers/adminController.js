const { readTransactions, readWallets, readUsers } = require('../utils/fileUtils');
const { getFlaggedTransactions: getFraudulentTransactions } = require('../services/fraudServices'); // Renamed for clarity

const viewFlaggedTransactions = async (req, res) => {
    const flagged = await getFraudulentTransactions();
    res.json(flagged);
};

const aggregateTotalUserBalances = async (req, res) => {
    const wallets = await readWallets();
    const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    const totalUsersWithWallets = wallets.length;
    res.json({ totalBalance, totalUsersWithWallets, currency: wallets.length > 0 ? wallets[0].currency : "N/A" });
};

const viewTopUsers = async (req, res) => {
    const { criteria } = req.params; // 'balance' or 'volume'
    const users = await readUsers();
    const wallets = await readWallets();
    const transactions = await readTransactions();

    let rankedUsers = [];

    if (criteria === 'balance') {
        rankedUsers = wallets
            .map(wallet => {
                const user = users.find(u => u.id === wallet.userId);
                return {
                    userId: wallet.userId,
                    username: user ? user.username : 'Unknown',
                    balance: wallet.balance
                };
            })
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10); // Top 10
    } else if (criteria === 'volume') {
        const userVolumes = {};
        transactions.forEach(t => {
            if (t.status === 'COMPLETED') { // Only count completed transactions for volume
                if (t.fromUserId) {
                    userVolumes[t.fromUserId] = (userVolumes[t.fromUserId] || 0) + t.amount;
                }
                // For deposits/withdrawals associated with a primary userId
                if (t.userId && (t.type === 'DEPOSIT' || t.type === 'WITHDRAW')) {
                     userVolumes[t.userId] = (userVolumes[t.userId] || 0) + t.amount;
                }
            }
        });

        rankedUsers = Object.entries(userVolumes)
            .map(([userId, volume]) => {
                const user = users.find(u => u.id === userId);
                return {
                    userId,
                    username: user ? user.username : 'Unknown',
                    volume
                };
            })
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10); // Top 10
    } else {
        return res.status(400).json({ message: 'Invalid criteria. Use "balance" or "volume".' });
    }
    res.json(rankedUsers);
};

module.exports = { viewFlaggedTransactions, aggregateTotalUserBalances, viewTopUsers };