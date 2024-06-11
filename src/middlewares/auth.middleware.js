import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // get the token from the cookies or from request headers
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "Unauthorized Request");
    }

    // verify the token using the ACCESS_TOKEN_SECRET
    const varifiedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // the varifiedToken is the object returned after verifying the token

    // if token is not varified that means its an unauthorized request
    if (!varifiedToken) {
      throw new ApiError(401, "Unauthorized Request");
    }

    // while generating access token, we have added _id, email, username, fullname of current user in the payload
    // so we can get ._id from the varifiedToken
    const user = await User.findById(varifiedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid Access Token, user");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Invalid Access Token, in catch");
  }
});
