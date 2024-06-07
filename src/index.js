import dotenv from "dotenv";
import connectDB from "./db/dbconnect.js";
import app from "./app.js";

dotenv.config({ path: "./env" });
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("Error:", error);
    });
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  })
  .catch((error) => {
    console.log("Error:", error);
  });

// import express from "express";
// const app = express();

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//     app.on("error", (error) => {
//       console.log("Error:", error);
//       throw error;
//     });

//     app.listen(process.env.PORT, () => {
//       console.log(`Server is running on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.log("Error:", error);
//   }
// })();
