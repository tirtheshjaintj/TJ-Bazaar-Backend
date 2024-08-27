const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
const expiresIn=process.env.TOKEN_EXPIRATION;

function setUser(user) {
    // Add 'iss' (issuer) and 'aud' (audience) claims for additional security
    // const payload = {
    //     user,
    //     iss: 'yourdomain.com', // Replace with your domain or organization
    //     aud: 'yourdomain.com', // Replace with your audience
    // };
    
    return jwt.sign({id:user._id},JWT_SECRET, { expiresIn});
}

function getUser(token) {
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(decoded);
        return decoded;
    } catch (err) {
        console.log(err);
        return null;
    }
}

module.exports = { getUser, setUser };
