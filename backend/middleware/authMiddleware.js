const jwt = require('jsonwebtoken');
const { readUsers } = require('../utils/fileUtils');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const users = await readUsers();
            req.user = users.find(u => u.id === decoded.id);
            if (!req.user) {
                return res.status(401).json({ message: 'User not found for token' });
            }
            // Exclude passwordHash from req.user
            const { passwordHash, ...userWithoutPassword } = req.user;
            req.user = userWithoutPassword;

            next();
        } catch (error) {
            console.error('Auth error:', error.message);
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

module.exports = { protect };