import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { ReviewsService } from "./reviews.service"
import { ToursModule } from "../tours/tours.module"
import { ReviewsController } from "./reviews.controller"
import { Review, ReviewSchema } from "./schemas/review.schema"

@Module({
  imports: [MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
  ToursModule
],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
