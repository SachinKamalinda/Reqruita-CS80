const mongose =require ("mongoose");

const MONGO_URI=process.env.MONGO_URL || "mongodb://127.0.0.1:27017/reqruita";

async function connectMongo() {
  try{
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");
  }catch(err){
    console.error("Failed to connect to MongoDB", err.message);

  }
  }

  module.exports=connectMongo;

