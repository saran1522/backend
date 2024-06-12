import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // steps to register a user:
  // check for all the required fields
  // validate the fields
  // check if username, email already exists
  // check for images, check for avatar
  // upload images on cloudinary
  // create user
  // check if user created
  // remove password and refreshToken from response
  // return response

  // getting the fields from the request body
  const { username, fullname, email, password } = req.body;

  // checking if all the fields are provided by the user or not
  // this check will happen on frontend too but its a good practice to do it on backend too
  if (
    [username, fullname, email, password].some((field) => field.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  // we have User model to interact with the database
  // check if username or email already exists in the database
  const userExisted = await User.findOne({
    // $or is an operator that returns true if any of the conditions are existed in database
    $or: [{ username }, { email }],
  });

  // throw an error if user already exists
  if (userExisted) {
    throw new ApiError(409, "Username or email already exists");
  }

  // as express gives us access to req.body, multer gives us access to req.files
  // as req.body contains form data, req.files contains files uploaded from the frontend
  // every file in req.files is an array of object that contains many fields including filename, path, type etc
  // req.files.avatar[0].path will give us the path of the uploaded file
  let localAvatarPath;
  if (req.files && req.files.avatar && req.files.avatar.length > 0) {
    localAvatarPath = await req.files?.avatar[0]?.path;
  }
  let localCoverImagePath;
  if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
    localCoverImagePath = await req.files?.coverImage[0]?.path;
  }

  // checking if avatar is provided by user or not
  if (!localAvatarPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // uploading the images on cloudinary using the utility function we have created
  const avatar = await uploadOnCloudinary(localAvatarPath);
  const coverImage = await uploadOnCloudinary(localCoverImagePath);

  // again checking if avatar is provided by user or not
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // creating the user in the database using the User model
  const user = await User.create({
    username: username.toLowerCase(), // its a good practice to store username in lowercase
    fullname,
    email,
    password,
    avatar: avatar?.url, // storing the cloudinary url in the database
    coverImage: coverImage?.url || "", // user may not provide cover image so we are storing empty string if cover image is not provided
  });

  // by using select method we can remove fields from the response
  // we have to pass -field_name to remove the field from the response
  // we are checking if user created or not and then removing password and refreshToken from the response by using select method
  const createdUser = await User.findById(user?._id).select(
    "-password -refreshToken"
  );

  // if user is not created then we are throwing an error
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // returning the response using ApiResponse class that we have created
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // take username or email and password from the request body
  // check for username and email not empty
  // find user error if not found
  // check password match or not
  // generate access token and refresh token

  // getting the fields from the request body
  const { username, email, password } = req.body;

  // checking if username or email is provided by the user or not
  if (!username || !email) {
    throw new ApiError(400, "Username and email is required");
  }

  // finding the user (username or email) in the database using the User model
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  // if user not found then throwing an error
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // checking if the password provided by the user is correct or not using the isCorrectPassword method we have created in the user model
  const isPasswordValid = user.isCorrectPassword(password);

  // if password is not valid then throwing an error
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // generating access token and refresh token using the generateTokens function we have created at top
  // that function using the generateAccessToken and generateRefreshToken methods we have created in the user model
  const { accessToken, refreshToken } = await generateTokens(user._id);

  // getting the user from the database using the User model and removing password and refreshToken
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // defining the options for the cookie
  // by using these options we are making cookies modifiable only from backend (server )
  // the frontend (client) can read them but can't modify them
  const options = {
    httpOnly: true,
    secure: true,
  };

  // returning the response with cookies
  // frontend can access the tokens from cookies and from response as well
  return res
    .status(200)
    .cookie("refreshToken", refreshToken) // using cookie middleware to store refresh token
    .cookie("accessToken", accessToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // logging out a user means removing the refresh token from the database
  // and clearing the cookies from the frontend
  // we are using varifyJWT middleware to check if the user is authenticated or not
  // if the user is authenticated then only he can logout
  // the varifyJWT middleware is also setting req.user to the user who is authenticated
  // now we can access the user from req.user and remove it's refreshToken from the database

  await User.findByIdAndUpdate(
    req.user._id,
    { refreshToken: undefined },
    { new: true } // new: true will return the updated user without refreshToken
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  // clearing the cookies (refreshToken and accessToken) from the frontend using clearCookie method
  // and returning the response
  return res
    .status(200)
    .clearCookie("refreshToken", options)
    .clearCookie("accessToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(400, "Unothorized Request");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );
  if (!decodedToken) {
    throw new ApiError(400, "Unothorized Request");
  }

  const user = await User.getUserById(decodedToken?._id);
  if (!user) {
    throw new ApiError(400, "Invalid Refresh Token");
  }

  if (incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(400, "Refresh Token is expired or used");
  }

  const { accessToken, newRefreshToken } = generateTokens(user._id);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        { accessToken, refreshToken: newRefreshToken },
        "Access Token Refreshed Successfully"
      )
    );
});

const changePassword = asyncHandler(async (req, res) => {
  // take old password, new password from user (req body)
  // validate (should not be empty)
  // check if old password is correct using isCorrectPassword method from user model
  // if not correct throw error
  // extrect user from req.user (set by verifyJWT middleware)
  // use findByIdAndUpdate to update the password

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password is required");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(400, "User not found");
  }

  const isCorrectPassword = await user?.isCorrectPassword(oldPassword);
  if (!isCorrectPassword) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname && !email) {
    throw new ApiError(400, "Any one field is required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path; //user will give only one (avatar) file so req.file
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path; //user will give only one (coverImage) file so req.file
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading avatar image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
