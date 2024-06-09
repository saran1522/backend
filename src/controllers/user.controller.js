import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  const localAvatarPath = req.files?.avatar[0]?.path;
  const localCoverImagePath = req.files?.coverImage[0]?.path;

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
    coverImage: coverImage?.url || "", // storing the cloudinary url in the database
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
    .json(ApiResponse(200, createdUser, "User registered successfully"));
});
export { registerUser };
