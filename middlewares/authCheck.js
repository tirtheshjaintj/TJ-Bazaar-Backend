const {getUser}=require("../helpers/jwt.helper");

async function restrictLogIn(req,res,next){
try{
const userId=req.headers["Authorization"];
const token=userId.split('Bearer ')[1];
const user=getUser(token);
if(!user) return res.status(401).json({error:"Invalid Login Details"});
req.user=user;
next();
}
catch(error){
    return res.status(401).json({error:"Wrong Details"});
}
}

module.exports={restrictLogIn};