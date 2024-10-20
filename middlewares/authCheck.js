const { getUser } = require("../helpers/jwt.helper");

async function restrictLogIn(req, res, next) {
    try {
        // Correct way to access authorization header (case-insensitive)
        let token = req.headers['authorization'];
        if (token && token.startsWith('Bearer ')) {
            token = token.substring(7); // Remove 'Bearer ' prefix
        }
        // console.log('Authorization token:', token);
        const user = getUser(token);    
        // console.log(user);    
        if (!user) {
            return res.status(401).json({ status: false, message: "Invalid Login Details" });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error('Error in restrictLogIn:', error);        
        return res.status(401).json({ status: false, message: "Wrong Details" });
    }
}

module.exports = { restrictLogIn };
