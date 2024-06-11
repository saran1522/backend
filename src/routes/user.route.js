import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

router.route("/login").post(loginUser);

// secured route
// we are using varifyJWT middleware to check if the user is authenticated or not
// if the user is authenticated then only he can logout
// the next() function is used to tell that the middleware has executed and now move to next middleware or next function
// we can write as many middlewares as we want in the route using next() in each
router.route("/logout").post(verifyJWT, logoutUser);

export default router;
