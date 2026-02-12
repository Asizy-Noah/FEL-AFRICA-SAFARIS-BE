import { Injectable, type NestMiddleware } from "@nestjs/common"
import type { Request, Response, NextFunction } from "express"
import type { JwtService } from "@nestjs/jwt"
import type { UsersService } from "../../modules/users/users.service"

// Extend the Express Request type to include user and session properties
declare module "express-session" {
  interface SessionData {
    user: any
    access_token: string
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

@Injectable()
export class SessionUserMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // If user is already set by passport, continue
    if (req.user) {
      return next()
    }

    // Check for user in session
    if (req.session?.user) {
      req.user = req.session.user

      // If there's an access token, set it in the Authorization header
      if (req.session.access_token) {
        req.headers.authorization = `Bearer ${req.session.access_token}`
      }
    }

    next()
  }
}
