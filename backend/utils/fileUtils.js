const fs = require('fs').promises;
const path = require('path');

const USERS_PATH = path.join(__dirname, '..', 'data', 'users.json');
const WALLETS_PATH = path.join(__dirname, '..', 'data', 'wallets.json');
const TRANSACTIONS_PATH = path.join(__dirname, '..', 'data', 'transactions.json');

const readData = async (filePath) => {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') { // File not found
            return []; // Return empty array if file doesn't exist
        }
        console.error(`Error reading file ${filePath}:`, error);
        throw error;
    }
};

const writeData = async (filePath, data) => {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        throw error;
    }
};

module.exports = {
    readUsers: () => readData(USERS_PATH),
    writeUsers: (data) => writeData(USERS_PATH, data),
    readWallets: () => readData(WALLETS_PATH),
    writeWallets: (data) => writeData(WALLETS_PATH, data),
    readTransactions: () => readData(TRANSACTIONS_PATH),
    writeTransactions: (data) => writeData(TRANSACTIONS_PATH, data),
};