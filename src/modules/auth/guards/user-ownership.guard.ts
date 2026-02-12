import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class UserOwnershipGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const userIdFromRoute = request.params.id; // Get the ID from the route parameter
    const loggedInUserId = request.user.id; // Get the ID of the logged-in user (assuming it's on req.user.id)

    // Check if the logged-in user is trying to update their own profile
    return userIdFromRoute === loggedInUserId;
  }
}