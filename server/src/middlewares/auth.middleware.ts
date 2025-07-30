import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { CustomRequest, IUser, User } from "../models/users.model";
import asyncHandler from "../utils/async-handler";
import { ACCESS_TOKEN_SECRET } from "../utils/env";
import { ApiError } from "../utils/api-error";

const authenticateUser = asyncHandler(
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token?.trim()) {
      throw new ApiError(401, "Session Expired !! Please login again");
    }

    const decodedToken = jwt.verify(token, ACCESS_TOKEN_SECRET!) as {
      _id: string;
    };

    if (!decodedToken) {
      throw new ApiError(401, "Unauthorized");
    }

    const user = await User.findById<IUser>(decodedToken._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationExpiry -forgotPasswordToken -forgotPasswordExpiry",
    );

    if (!user) {
      throw new ApiError(404, "Account doesn't exist");
    }

    req.user = user;
    next();
  },
);

const verifyPermission = (roles: string[] = []) =>
  asyncHandler(
    async (req: CustomRequest, res: Response, next: NextFunction) => {
      if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized");
      }
      if (roles.includes(req.user.role)) {
        next();
      } else {
        throw new ApiError(403, "Unauthorized action");
      }
    },
  );

export const avoidInProduction = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === "development") {
      next();
    } else {
      throw new ApiError(
        403,
        "This service is only available in the local environment.",
      );
    }
  },
);

export { authenticateUser, verifyPermission };
