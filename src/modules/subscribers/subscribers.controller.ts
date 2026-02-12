import { Controller, Get, Post, Param, UseGuards, Req, Res, Render, Query, Body } from "@nestjs/common"
import { Response } from "express"
import { SubscribersService } from "./subscribers.service"
import type { CreateSubscriberDto } from "./dto/create-subscriber.dto"
import type { UpdateSubscriberDto } from "./dto/update-subscriber.dto"
import { SessionAuthGuard } from "../auth/guards/session-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { UserRole } from "../users/schemas/user.schema"

@Controller("subscribers")
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

 @Post()
  async createSubscriber(@Body() createSubscriberDto: CreateSubscriberDto, @Res() res: Response, @Req() req: any) { // Add @Req() req for flash messages
    
    try {
      await this.subscribersService.create(createSubscriberDto);
      req.flash("success_msg", "You've successfully subscribed to our newsletter!");
      
      return res.redirect("/"); // Redirect to homepage
    } catch (error) {
      
      req.flash("error_msg", error.message || "Failed to subscribe. Please try again.");
      return res.redirect("/"); // Redirect to homepage
    }
  }

  @Get("dashboard")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/subscribers/index")
  async getSubscribers(@Query() query, @Req() req) {
    const subscribers = await this.subscribersService.findAll(query)

    return {
      title: "Subscribers - Dashboard",
      subscribers,
      user: req.user,
      query,
      layout: "layouts/dashboard",
    }
  }

  @Get("dashboard/edit/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/subscribers/edit")
  async getEditSubscriberPage(@Param("id") id: string, @Req() req) {
    const subscriber = await this.subscribersService.findOne(id)

    return {
      title: "Edit Subscriber - Dashboard",
      subscriber,
      user: req.user,
      layout: "layouts/dashboard",
    }
  }

  @Post("dashboard/edit/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateSubscriber(
    @Param("id") id: string,
    @Body() updateSubscriberDto: UpdateSubscriberDto,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      await this.subscribersService.update(id, updateSubscriberDto)

      req.flash("success_msg", "Subscriber updated successfully")
      return res.redirect("/subscribers/dashboard")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect(`/subscribers/dashboard/edit/${id}`)
    }
  }

  @Get("dashboard/toggle/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async toggleSubscriberStatus(@Param("id") id: string, @Req() req, @Res() res: Response) {
    try {
      await this.subscribersService.toggleActive(id)

      req.flash("success_msg", "Subscriber status toggled successfully")
      return res.redirect("/subscribers/dashboard")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect("/subscribers/dashboard")
    }
  }

  @Post("dashboard/delete/:id") 
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteSubscriber(@Param("id") id: string, @Req() req, @Res() res: Response) {
    try {
      await this.subscribersService.remove(id)

      req.flash("success_msg", "Subscriber deleted successfully")
      return res.redirect("/subscribers/dashboard")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect("/subscribers/dashboard")
    }
  }
}
