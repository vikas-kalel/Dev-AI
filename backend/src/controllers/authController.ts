import type { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService.js";
import { ENV } from "../config/env.js";

export async function signup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Name, email, and password are required.",
          },
        });
      return;
    }

    const { user, verificationToken } = await authService.signup(
      name,
      email,
      password,
    );

    res.status(201).json({
      success: true,
      message:
        "Account created successfully. Please check your email to verify your account.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
      // In non-production or dev, include verificationToken to ease onboarding testing
      verificationToken:
        ENV.NODE_ENV !== "production" ? verificationToken : undefined,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, token } = req.body;
    if (!email || !token) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and token are required.",
          },
        });
      return;
    }

    const user = await authService.verifyEmail(email, token);

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You may now log in.",
      user: {
        id: user._id,
        email: user.email,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and password are required.",
          },
        });
      return;
    }

    const { user, session, token } = await authService.login(email, password);

    // Set secure HTTP-only cookie
    res.cookie(ENV.COOKIE_NAME, token, {
      httpOnly: true,
      secure: ENV.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
      sessionId: session._id,
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (req.sessionId) {
      await authService.logout(req.sessionId);
    }
    res.clearCookie(ENV.COOKIE_NAME);
    res
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res
        .status(400)
        .json({
          error: { code: "VALIDATION_ERROR", message: "Email is required." },
        });
      return;
    }

    await authService.forgotPassword(email);
    res.status(200).json({
      success: true,
      message:
        "If an account exists with this email, a password reset link has been dispatched.",
    });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) {
      res
        .status(400)
        .json({
          error: {
            code: "VALIDATION_ERROR",
            message: "Email, token, and new password are required.",
          },
        });
      return;
    }

    await authService.resetPassword(email, token, newPassword);
    res.status(200).json({
      success: true,
      message:
        "Password reset successful. Please log in with your new credentials.",
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.userId) {
      res
        .status(401)
        .json({
          error: { code: "UNAUTHORIZED", message: "Not authenticated." },
        });
      return;
    }

    const data = await authService.getMe(req.userId);
    res.status(200).json({
      success: true,
      user: {
        id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        status: data.user.status,
      },
      organizations: data.organizations,
      projects: data.projects,
    });
  } catch (err) {
    next(err);
  }
}
