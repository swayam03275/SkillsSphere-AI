import { validateRegisterInput } from "../../validations/authValidation.js";
import { registerUserAndIssueToken, loginUserAndIssueToken } from "./service.js";

// REGISTER
export const register = async (req, res) => {
  const validation = validateRegisterInput(req.body);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      message: "Invalid registration payload",
      errors: validation.errors
    });
  }

  try {
    const authResult = await registerUserAndIssueToken(validation.data);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: authResult
    });
  } catch (error) {
    const isDuplicate =
      error.code === "USER_ALREADY_EXISTS" || error?.code === 11000;

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists"
      });
    }

    if (error.code === "MISSING_JWT_SECRET") {
      return res.status(500).json({
        success: false,
        message: "Server configuration error: JWT secret is missing"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register user right now"
    });
  }
};

// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  try {
    const authResult = await loginUserAndIssueToken({ email, password });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: authResult
    });
  } catch (error) {
    if (error.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to login right now"
    });
  }
};