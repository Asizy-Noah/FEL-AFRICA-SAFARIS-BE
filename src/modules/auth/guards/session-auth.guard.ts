// src/auth/guards/session-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express'; // Import Request and Response types

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>(); // Get the Response object

    const sessionUser = request.session?.user;

    if (!sessionUser) {
      // If no session user, redirect to the login page
      // It's crucial to use response.redirect() here as it's a browser redirect.
      response.redirect('/auth/login');
      return false; // Prevent further execution of the route handler
    }

    // Attach user to request object for subsequent guards/middlewares (like RolesGuard)
    request.user = sessionUser;

    return true;
  }
}