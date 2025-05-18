const jwt = require('jsonwebtoken');

const generateToken = (userId, username) => {
    return jwt.sign(
        { id: userId, username },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

module.exports = { generateToken };