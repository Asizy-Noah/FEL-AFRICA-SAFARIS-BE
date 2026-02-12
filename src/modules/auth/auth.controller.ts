import {
  Controller,
  Post,
  Body,
  Get,
  Render,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import { Response } from "express";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { CreateUserDto } from "../users/dto/create-user.dto";
import { LoginUserDto } from "../users/dto/login-user.dto";
import { ForgotPasswordDto } from "../users/dto/forgot-password.dto";
import { ResetPasswordDto } from "../users/dto/reset-password.dto";
import { UserRole } from "../users/schemas/user.schema";
import { SessionAuthGuard } from "./guards/session-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Get("register")
  @Render("auth/register")
  getRegisterPage() {
    return {
      title: "Register",
      layout: "layouts/auth",
    };
  }

  @Post("register")
  async register(@Body() createUserDto: CreateUserDto, @Req() req: any, @Res() res: Response) {
    try {
      const user = await this.usersService.create(createUserDto);

      if (user.role === UserRole.AGENT) {
        req.flash("success_msg", "Registration successful! Please login.");
        return res.redirect("/auth/login");
      } else {
        // Auto-login non-agent users and show pending page
        req.session.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        };
        return res.redirect("/dashboard/pending-approval");
      }
    } catch (error) {
      req.flash("error_msg", error.message);
      return res.redirect("/auth/register");
    }
  }

  @Get("login")
  @Render("auth/login")
  getLoginPage() {
    return {
      title: "Login",
      layout: "layouts/auth",
    };
  }

  @Post("login")
  async login(@Body() loginUserDto: LoginUserDto, @Req() req, @Res() res: Response) {

    try {
      const result = await this.authService.login(loginUserDto);

      if (result && result.user) {
        req.session.user = result.user; // THIS IS THE CRITICAL LINE FOR SESSION

        if (result.status === "pending") {
          return res.redirect("/auth/pending-approval");
        }

        const redirectUrl =
          result.user.role === UserRole.ADMIN ? "/dashboard/index" : "/dashboard/index";
        return res.redirect(redirectUrl);
      } else {
        req.flash("error_msg", "Login failed: Invalid credentials or internal error."); 
        return res.redirect("/auth/login");
      }

    } catch (error) {
      console.error("--- LOGIN ROUTE CAUGHT ERROR ---"); // LOG 11: Error caught
      console.error("Error object:", error); // LOG 12: Full error object
      console.error("Error message:", error.message); // LOG 13: Just the error message

      // Check if req.flash is available and session is working
      if (req.flash) {
        req.flash("error_msg", error.message); // This line relies on session.
      } else {
      }

      return res.redirect("/auth/login");
    } finally {
    }
  }

  @UseGuards(SessionAuthGuard)
  @Get("pending-approval")
  @Render("auth/pending-approval")
  getPendingApprovalPage(@Req() req) {
    return {
      title: "Pending Approval",
      user: req.session.user,
      layout: "layouts/auth",
    };
  }

  @Get("logout")
  logout(@Req() req, @Res() res: Response) {
    req.session.destroy(() => {
      res.redirect("/auth/login");
    });
  }

  @Get("forgot-password")
  @Render("auth/forgot-password")
  getForgotPasswordPage() {
    return {
      title: "Forgot Password",
      layout: "layouts/auth",
    };
  }

  @Post("forgot-password")
async forgotPassword(
  @Body() forgotPasswordDto: ForgotPasswordDto,
  @Req() req,
  @Res() res: Response,
) {
  
  try {
    await this.usersService.createForgotPasswordToken(forgotPasswordDto.email);
   
    req.flash("success_msg", "A password reset link has been sent to your email");
    
    return res.redirect("/auth/login");
  } catch (error) {
    // Log the full error object!
    req.flash("error_msg", error.message);
    
    return res.redirect("/auth/forgot-password");
  }
}

  @Get("reset-password/:token")
  @Render("auth/reset-password")
  getResetPasswordPage(@Req() req) {
    return {
      title: "Reset Password",
      token: req.params.token,
      layout: "layouts/auth",
    };
  }

  @Post("reset-password")
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      await this.usersService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.password,
        resetPasswordDto.confirmPassword,
      );

      req.flash("success_msg", "Your password has been updated! Please login.");
      return res.redirect("/auth/login");
    } catch (error) {
      req.flash("error_msg", error.message);
      return res.redirect(`/auth/reset-password/${resetPasswordDto.token}`);
    }
  }
}
