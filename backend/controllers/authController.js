const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readUsers, writeUsers, readWallets, writeWallets } = require('../utils/fileUtils');
const { generateToken } = require('../utils/tokenUtils');

const MAX_ATTEMPTS = 3;
const LOCK_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const registerUser = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
    }
    // Require at least one special character and one number
    if (!/(?=.*[0-9])(?=.*[^a-zA-Z0-9])/.test(password)) {
        return res.status(400).json({ message: 'Password must contain at least one special character and one number.' });
    }

    const users = await readUsers();
    if (users.find(user => user.username === username)) {
        return res.status(400).json({ message: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = { id: uuidv4(), username, passwordHash, loginAttempts: 0, isLocked: false, lockTime: null };

    users.push(newUser);
    await writeUsers(users);

    // Create a wallet for the new user
    const wallets = await readWallets();
    wallets.push({ userId: newUser.id, balance: 0, currency: 'INR' }); // Start with 0 balance
    await writeWallets(wallets);

    res.status(201).json({
        message: 'User registered successfully',
        user: { id: newUser.id, username: newUser.username },
        token: generateToken(newUser.id, newUser.username)
    });
};

const loginUser = async (req, res) => {
    const { username, password } = req.body;
    const users = await readUsers();
    const user = users.find(u => u.username === username);

    // If username does not exist, do not increment attempts or lock any account
    if (!user) {
        return res.status(401).json({ message: `Invalid username or password. 2 tries remaining.` });
    }

    // If locked, check if 24 hours have passed
    if (user.isLocked) {
        const now = Date.now();
        if (user.lockTime && now - user.lockTime >= LOCK_DURATION_MS) {
            // Unlock the account
            user.isLocked = false;
            user.loginAttempts = 0;
            user.lockTime = null;
            await writeUsers(users);
        } else {
            return res.status(403).json({ message: 'Your account is locked due to too many failed login attempts. Retry after 24 hrs.' });
        }
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
    if (isPasswordCorrect) {
        user.loginAttempts = 0;
        user.isLocked = false;
        user.lockTime = null;
        await writeUsers(users);
        return res.json({
            _id: user.id,
            username: user.username,
            token: generateToken(user.id, user.username)
        });
    } else {
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        if (user.loginAttempts >= MAX_ATTEMPTS) {
            user.isLocked = true;
            user.lockTime = Date.now();
            await writeUsers(users);
            return res.status(403).json({ message: 'Your account is locked due to too many failed login attempts. Retry after 24 hrs.' });
        } else {
            await writeUsers(users);
            const triesLeft = MAX_ATTEMPTS - user.loginAttempts;
            return res.status(401).json({ message: `Invalid username or password. ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} remaining.` });
        }
    }
};

module.exports = { registerUser, loginUser };