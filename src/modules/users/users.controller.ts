// src/modules/users/users.controller.ts

import { Controller, Get, Post, Body, Param, UseGuards, Req, Res, Render, Query, Patch } from "@nestjs/common" // Added Patch
import { Response } from "express"
import { UsersService } from "./users.service"
import type { UpdateUserDto } from "./dto/update-user.dto"
import { SessionAuthGuard } from "../auth/guards/session-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { UserRole, UserStatus } from "./schemas/user.schema" // Import UserStatus
import { UserOwnershipGuard } from "../auth/guards/user-ownership.guard";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- Admin: View All Agents ---
  @Get("dashboard/agents")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Render("dashboard/agents/index") // Make sure this path is correct for your EJS files
  async getAgents(@Query() query, @Req() req) {
    const agents = await this.usersService.findAllAgents()

    return {
      title: "Agents - Dashboard",
      agents,
      user: req.user,
      layout: "layouts/dashboard",
      query,
      // Pass flash messages
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg'),
    }
  }

  // --- Admin: Render Edit Agent Page (for any agent) ---
  @Get("dashboard/agents/edit/:id") // New route for admin to edit specific agent
  @UseGuards(SessionAuthGuard, RolesGuard, UserOwnershipGuard)
  @Render("dashboard/agents/edit") // Path to your new edit-agent.ejs
  async getEditAgentPage(@Param('id') id: string, @Req() req) {
    try {
      const agent = await this.usersService.findOne(id)
      if (agent.role !== UserRole.AGENT) {
        req.flash("error_msg", "User is not an agent.")
        return req.res.redirect("/users/dashboard/agents")
      }

      return {
        title: "Edit Agent - Dashboard",
        agent,
        user: req.user,
        layout: "layouts/dashboard",
        success_msg: req.flash('success_msg'),
        error_msg: req.flash('error_msg'),
      }
    } catch (error) {
      req.flash("error_msg", error.message)
      return req.res.redirect("/users/dashboard/agents")
    }
  }

  
 // --- Admin: Update Agent Details ---
 @Patch("dashboard/agents/update/:id")
  @UseGuards(SessionAuthGuard, RolesGuard, UserOwnershipGuard)
  async adminUpdateAgent(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto, // This DTO no longer contains password
    @Req() req,
    @Res() res: Response
  ) {
    try {
      
      delete updateUserDto.status; 
    
      const updatedAgent = await this.usersService.update(id, updateUserDto, req.user.id);

      req.flash("success_msg", `Agent ${updatedAgent.name}'s details updated successfully.`);
      return res.redirect('/users/dashboard/agents');
    } catch (error) {
      req.flash("error_msg", error.message);
      return res.redirect(`/users/dashboard/agents/edit/${id}`);
    }
  }

  // ... (activateAgent, deactivateAgent, deleteAgent routes remain the same)

  


  // --- Admin: Activate Agent (using POST for form submission) ---
  @Post("dashboard/agents/activate/:id") // Change to POST if using form
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async activateAgent(@Param('id') id: string, @Req() req, @Res() res: Response) {
    try {
      await this.usersService.updateAgentStatus(id, UserStatus.ACTIVE, req.user.id); // Pass updaterId
      req.flash("success_msg", "Agent activated successfully");
      return res.redirect("/users/dashboard/agents");
    } catch (error) {
      req.flash("error_msg", error.message);
      return res.redirect("/users/dashboard/agents");
    }
  }

  // --- Admin: Deactivate Agent (using POST for form submission) ---
  @Post("dashboard/agents/deactivate/:id") // Change to POST if using form
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deactivateAgent(@Param('id') id: string, @Req() req, @Res() res: Response) {
    try {
      await this.usersService.updateAgentStatus(id, UserStatus.INACTIVE, req.user.id); // Pass updaterId
      req.flash("success_msg", "Agent deactivated successfully");
      return res.redirect("/users/dashboard/agents");
    } catch (error) {
      req.flash("error_msg", error.message);
      return res.redirect("/users/dashboard/agents");
    }
  }

  // --- Admin: Delete Agent (using POST for form submission) ---
  @Post("dashboard/agents/delete/:id") // Change to POST if using form
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteAgent(@Param('id') id: string, @Req() req, @Res() res: Response) {
    try {
      await this.usersService.remove(id) // `remove` is already protected by findByIdAndDelete
      req.flash("success_msg", "Agent deleted successfully")
      return res.redirect("/users/dashboard/agents")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect("/users/dashboard/agents")
    }
  }


  // --- Agent/Admin: Update Own Profile Details ---
  @Post("dashboard/profile/update")
  @UseGuards(SessionAuthGuard)
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto, // This DTO no longer contains password
    @Req() req,
    @Res() res: Response
  ) {
    try {
      // Users can edit name, email, phone, company details, country.
      // They cannot change their own 'role' or 'status', nor their password here.
      delete updateUserDto.role;
      delete updateUserDto.status;
      // delete (updateUserDto as any).password;
      // delete (updateUserDto as any).confirmPassword;

      await this.usersService.update(req.user.id, updateUserDto, req.user.id);

      req.flash("success_msg", "Profile updated successfully");
      return res.redirect("/users/dashboard/profile");
    } catch (error) {
      req.flash("error_msg", error.message);
      return res.redirect("/users/dashboard/profile");
    }
  }
}