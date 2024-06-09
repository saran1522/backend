import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar", //this name should be same in the frontend
      maxCount: 1,
    },
    {
      name: "coverImage", //this name should be same in the frontend
      maxCount: 1,
    },
  ]),
  registerUser
);

export default router;
