import { Controller, Get, Render, UseGuards, Req, Query } from "@nestjs/common";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { Roles } from "../auth/decorators/roles.decorator"; // Assuming you have this decorator
import { UserRole } from "../users/schemas/user.schema";
import { Request } from 'express'; // Import Request type
import { BlogsService } from "../blogs/blogs.service";
import { ToursService } from "../tours/tours.service";
import { BookingsService } from "../bookings/bookings.service";
import { ReviewsService } from "../reviews/reviews.service";
import { SubscribersService } from "../subscribers/subscribers.service";
import { Blog } from "../blogs/schemas/blog.schema"; // Import Blog type
import { Booking } from "../bookings/schemas/booking.schema"; // Import Booking type (assuming it exists)
import { Review } from "../reviews/schemas/review.schema"; // Import Review type (assuming it exists)
import { Subscriber } from "../subscribers/schemas/subscriber.schema"; // Import Subscriber type (assuming it exists)


@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly blogsService: BlogsService,
    private readonly toursService: ToursService,
    private readonly bookingsService: BookingsService,
    private readonly reviewsService: ReviewsService,
    private readonly subscribersService: SubscribersService,
  ) {}

  @Get('index')
  @Render('dashboard/index')
  @UseGuards(SessionAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async getDashboard(@Req() req: Request, @Query() query: any) {
    const user = req.user as any;
    const isUserAdmin = user.role === UserRole.ADMIN;

    let tours: any[] = [];
    let bookings: Booking[] = [];
    let blogs: Blog[] = [];
    let reviews: Review[] = [];
    let subscribers: Subscriber[] = [];
    let recentBookings: Booking[] = [];
    let pendingReviews: Review[] = [];

    // Define common query options for consistency
    const pageNum = query.page ? parseInt(query.page.toString(), 10) : 1;
    const limitNum = query.limit ? parseInt(query.limit.toString(), 10) : 5;
    const sortBy = query.sortBy || 'newest';

    // IMPORTANT: Create two sets of common options if different services expect different types
    // Options for services that expect numbers for page/limit (like blogsService)
    const commonQueryOptionsForNumbers = {
        page: pageNum,
        limit: limitNum,
        sortBy: sortBy
    };

    // Options for services that expect strings for page/limit (like toursService might, based on previous error)
    const commonQueryOptionsForStrings = {
        page: pageNum.toString(),
        limit: limitNum.toString(),
        sortBy: sortBy
    };


    try {
        if (isUserAdmin) {
            const [toursResult, bookingsArray, blogsResult, reviewsArray, subscribersArray] = await Promise.all([
                // toursService expects string page/limit
                this.toursService.findAll(commonQueryOptionsForStrings),
                // bookingsService, reviewsService, subscribersService: Assuming they are flexible or also expect strings
                this.bookingsService.findAll(commonQueryOptionsForStrings), // Adjust if it expects numbers or no options
                // blogsService expects numbers for page/limit - THIS IS THE KEY FIX
                this.blogsService.findAll(commonQueryOptionsForNumbers),
                this.reviewsService.findAll(commonQueryOptionsForStrings), // Adjust if it expects numbers or no options
                this.subscribersService.findAll(commonQueryOptionsForStrings), // Adjust if it expects numbers or no options
            ]);

            tours = toursResult.tours;
            bookings = bookingsArray;
            blogs = blogsResult.blogs;
            reviews = reviewsArray;
            subscribers = subscribersArray;

            recentBookings = bookings.slice(0, 5);
            pendingReviews = reviews.filter(review => review.status === 'pending');

        } else { // isUserAgent
            const [toursResult, bookingsArray, blogsResult] = await Promise.all([
                // toursService expects string page/limit
                this.toursService.findAll({ ...commonQueryOptionsForStrings, createdBy: user._id.toString() }),
                // bookingsService: Assuming it expects string page/limit
                this.bookingsService.findAll({ ...commonQueryOptionsForStrings, agent: user._id.toString() }),
                // blogsService expects numbers for page/limit - THIS IS THE KEY FIX
                this.blogsService.findAll({ ...commonQueryOptionsForNumbers, author: user._id.toString() }),
            ]);

            tours = toursResult.tours;
            bookings = bookingsArray;
            blogs = blogsResult.blogs;

            recentBookings = [];
            pendingReviews = [];
        }
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        req.flash("error_msg", "Failed to load some dashboard data. Please try again.");
        tours = [];
        bookings = [];
        blogs = [];
        reviews = [];
        subscribers = [];
        recentBookings = [];
        pendingReviews = [];
    }

    return {
      title: 'Dashboard',
      user: user,
      layout: 'layouts/dashboard',
      stats: {
        tours: tours.length,
        bookings: bookings.length,
        blogs: blogs.length,
        reviews: reviews.length,
        subscribers: subscribers.length,
        pendingReviews: pendingReviews.length,
      },
      recentBookings: recentBookings,
      pendingReviews: pendingReviews,
      messages: req.flash(),
    };
  }


  @Get('pending-approval')
  @Render('auth/pending-approval')
  getPendingApprovalPage(@Req() req) {
    return {
      title: 'Account Pending Approval',
      user: req.user,
      layout: 'layouts/auth',
    };
  }
}