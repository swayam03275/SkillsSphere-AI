import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../database/models/User.js";

const SALT_ROUNDS = 12;


const buildAuthToken = (user) => {
  if (!process.env.JWT_SECRET) {
    const error = new Error("Missing JWT_SECRET in environment variables");
    error.code = "MISSING_JWT_SECRET";
    throw error;
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
};


export const registerUserAndIssueToken = async ({ name, email, password, role }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    const error = new Error("User already exists with this email");
    error.code = "USER_ALREADY_EXISTS";
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role
  });

  const token = buildAuthToken(user);

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    }
  };
};
export const loginUserAndIssueToken = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("Invalid credentials");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    const error = new Error("Invalid credentials");
    error.code = "INVALID_CREDENTIALS";
    throw error;
  }

  const token = buildAuthToken(user);

  return {
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};