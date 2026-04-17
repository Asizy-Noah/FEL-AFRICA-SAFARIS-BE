import { Controller, Get, Post, Body, Param, UseGuards, Req, Res, Render, Query } from "@nestjs/common"
import { Response } from "express"
import { ReviewsService } from "./reviews.service"
import { CreateReviewDto } from "./dto/create-review.dto"
import { UpdateReviewDto } from "./dto/update-review.dto"
import { SessionAuthGuard } from "../auth/guards/session-auth.guard"
import { RolesGuard } from "../auth/guards/roles.guard"
import { Roles } from "../auth/decorators/roles.decorator"
import { UserRole } from "../users/schemas/user.schema"
import { ReviewStatus } from "./schemas/review.schema"
import { ToursService } from "../tours/tours.service"

@Controller("reviews")
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly toursService: ToursService,
  ) {}

  @Post()
  async createReview(@Body() createReviewDto: CreateReviewDto, @Res() res: Response) {
    try {
      await this.reviewsService.create(createReviewDto)

      return res.redirect(createReviewDto.tour ? `/tours/${createReviewDto.tour}?review=success` : "/?review=success")
    } catch (error) {
      return res.redirect(createReviewDto.tour ? `/tours/${createReviewDto.tour}?review=error` : "/?review=error")
    }
  }

  @Get("dashboard")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/reviews/index")
  async getReviews(@Query() query, @Req() req) {
    const reviews = await this.reviewsService.findAll(query)
    const tours = await this.toursService.findAll()

    return {
      title: "Reviews - Dashboard",
      reviews,
      tours,
      user: req.user,
      query,
      layout: "layouts/dashboard",
    }
  }

  @Get("dashboard/view/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/reviews/view")
  async getReview(@Param("id") id: string, @Req() req) {
    const review = await this.reviewsService.findOne(id)

    return {
      title: "View Review - Dashboard",
      review,
      user: req.user,
      layout: "layouts/dashboard",
    }
  }

  // ----------------------------------------------------------------------
  // 2. Dashboard: Add New Review (Admin UI) - GET (Render Form)
  // ----------------------------------------------------------------------
  @Get("dashboard/add")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/reviews/add")
  async renderAddReviewForm(@Req() req) {
    // Fetch all tours to populate the dropdown in the form
    const tours = await this.toursService.findAll()
    
    return {
      title: "Add New Review - Dashboard",
      tours, // Pass tours list to the EJS template
      user: req.user,
      layout: "layouts/dashboard",
    }
  }
  
  // ----------------------------------------------------------------------
  // 3. Dashboard: Add New Review (Admin UI) - POST (Handle Submission)
  // Note: This route is for manually created reviews via the dashboard.
  // ----------------------------------------------------------------------
  @Post("dashboard/reviews/dashboard/add")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addReviewFromDashboard(@Body() createReviewDto: CreateReviewDto, @Req() req, @Res() res: Response) {
    try {
      // Note: Manually created reviews often default to 'approved' or can be set by the form
      await this.reviewsService.create(createReviewDto)
      req.flash("success_msg", "Review added successfully!")
      return res.redirect("/reviews/dashboard")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect("/reviews/dashboard/add")
    }
  }

  // ----------------------------------------------------------------------
  // 4. Dashboard: Edit Review - GET (Render Form)
  // ----------------------------------------------------------------------
  @Get("dashboard/edit/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/reviews/edit")
  async renderEditReviewForm(@Param("id") id: string, @Req() req) {
    const review = await this.reviewsService.findOne(id)
    const tours = await this.toursService.findAll()

    return {
      title: "Edit Review - Dashboard",
      review, // Pass existing review data to the EJS template
      tours, // Pass tours list to the EJS template
      user: req.user,
      layout: "layouts/dashboard",
    }
  }

  // ----------------------------------------------------------------------
  // 5. Dashboard: Edit Review - POST (Handle Submission/Update)
  // Note: I'm using POST here to match your other dashboard routes, but
  // you should configure a method override (like a hidden field with _method=PUT)
  // in your EJS form to make this a true PUT/PATCH request on the server.
  // The EJS template for 'edit.ejs' was written with this assumption:
  // <form action="/dashboard/reviews/<%= review._id %>?_method=PUT" method="POST">
  // ----------------------------------------------------------------------
  @Post("dashboard/edit/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateReview(@Param("id") id: string, @Body() updateReviewDto: UpdateReviewDto, @Req() req, @Res() res: Response) {
    try {
      await this.reviewsService.update(id, updateReviewDto)

      req.flash("success_msg", "Review updated successfully!")
      return res.redirect("/reviews/dashboard")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect(`/reviews/dashboard/edit/${id}`)
    }
  }

  @Post("dashboard/respond/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async respondToReview(
    @Param("id") id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      await this.reviewsService.update(id, updateReviewDto)

      req.flash("success_msg", "Response added successfully")
      return res.redirect("/reviews/dashboard")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect(`/reviews/dashboard/view/${id}`)
    }
  }

  @Get("dashboard/approve/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveReview(@Param("id") id: string, @Req() req, @Res() res: Response) {
    try {
      await this.reviewsService.updateStatus(id, ReviewStatus.APPROVED)

      req.flash("success_msg", "Review approved successfully")
      return res.redirect("/reviews/dashboard")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect("/reviews/dashboard")
    }
  }

  @Get("dashboard/reject/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectReview(@Param("id") id: string, @Req() req, @Res() res: Response) {
    try {
      await this.reviewsService.updateStatus(id, ReviewStatus.REJECTED)

      req.flash("success_msg", "Review rejected successfully")
      return res.redirect("/reviews/dashboard")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect("/reviews/dashboard")
    }
  }

  @Get("dashboard/delete/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteReview(@Param("id") id: string, @Req() req, @Res() res: Response) {
    try {
      await this.reviewsService.remove(id)

      req.flash("success_msg", "Review deleted successfully")
      return res.redirect("/reviews/dashboard")
    } catch (error) {
      req.flash("error_msg", error.message)
      return res.redirect("/reviews/dashboard")
    }
  }
}
