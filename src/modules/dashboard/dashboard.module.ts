import { Module } from "@nestjs/common"
import { DashboardController } from "./dashboard.controller"
import { ToursModule } from "../tours/tours.module"
import { BookingsModule } from "../bookings/bookings.module"
import { BlogsModule } from "../blogs/blogs.module"
import { ReviewsModule } from "../reviews/reviews.module"
import { SubscribersModule } from "../subscribers/subscribers.module"

@Module({
  imports: [ToursModule, BookingsModule, BlogsModule, ReviewsModule, SubscribersModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
