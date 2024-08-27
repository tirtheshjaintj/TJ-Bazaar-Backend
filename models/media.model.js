const mongoose= require('mongoose');

const mediaSchema=new mongoose.Schema({
product_id:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"product",
    unique:true
},
images:{
    type:[String],
    required:true
}
},{timestamps:true});


const media=mongoose.model("media",mediaSchema);
module.exports=media;