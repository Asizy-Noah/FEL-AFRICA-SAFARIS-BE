import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { Review, ReviewStatus } from "./schemas/review.schema"
import type { CreateReviewDto } from "./dto/create-review.dto"
import type { UpdateReviewDto } from "./dto/update-review.dto"

@Injectable()
export class ReviewsService {
  private reviewModel: Model<Review>

  constructor(
    @InjectModel(Review.name) reviewModel: Model<Review>,
  ) {
    this.reviewModel = reviewModel;
  }

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    const newReview = new this.reviewModel(createReviewDto)
    return newReview.save()
  }

  async findAll(query?: any): Promise<Review[]> {
    const filter: any = {}

    // Handle search query
    if (query && query.search) {
      filter.$text = { $search: query.search }
    }

    // Filter by status
    if (query && query.status) {
      filter.status = query.status
    }

    // Filter by tour
    if (query && query.tour) {
      filter.tour = query.tour
    }

    return this.reviewModel.find(filter).sort({ createdAt: -1 }).populate("tour", "title slug").exec()
  }

  async findApproved(limit?: number): Promise<Review[]> {
    const query = this.reviewModel
      .find({ status: ReviewStatus.APPROVED })
      .sort({ createdAt: -1 })
      .populate("tour", "title slug")

    if (limit) {
      query.limit(limit)
    }

    return query.exec()
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewModel.findById(id).populate("tour", "title slug").exec()

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`)
    }

    return review
  }

  async update(id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    // If there's a response, add the response date
    if (updateReviewDto.response) {
      updateReviewDto["responseDate"] = new Date()
    }

    const updatedReview = await this.reviewModel.findByIdAndUpdate(id, updateReviewDto, { new: true }).exec()

    if (!updatedReview) {
      throw new NotFoundException(`Review with ID ${id} not found`)
    }

    return updatedReview
  }

  async remove(id: string): Promise<Review> {
    const deletedReview = await this.reviewModel.findByIdAndDelete(id).exec()

    if (!deletedReview) {
      throw new NotFoundException(`Review with ID ${id} not found`)
    }

    return deletedReview
  }

  async updateStatus(id: string, status: ReviewStatus): Promise<Review> {
    const review = await this.reviewModel.findById(id).exec()

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`)
    }

    review.status = status
    return review.save()
  }
}
