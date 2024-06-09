import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

//we can use 'use' method with app to use middlewares
//using different configurations below to communicate data in different formats
//data may come in any formet, like json, text
app.use(express.json({ limit: "20kb" }));
//data url may be encoded, like name+age or name%20age
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
// data may be static files like images, pdf etc so we configure a folder for storing them
app.use(express.static("public"));
// we can also interact(CRUD) with cookies, so we use cookie-parser
app.use(cookieParser());

//importing routes
import userRouter from "./routes/user.route.js";

// declaring routes
app.use("/api/v1/users", userRouter);

export default app;
