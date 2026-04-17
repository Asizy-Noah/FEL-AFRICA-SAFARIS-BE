// src/modules/tours/tours.service.ts

import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Tour, TourStatus } from "./schemas/tour.schema";
import { CreateTourDto } from "./dto/create-tour.dto";
import { UpdateTourDto } from "./dto/update-tour.dto";
import slugify from 'slugify';

// Define an interface for the findAll options to ensure type safety
export interface FindAllToursOptions {
  page?: string;
  limit?: string;
  search?: string;
  status?: TourStatus;
  country?: string; // Expects country ID
  category?: string; // Expects category ID
  createdBy?: string; // Expects user ID
  featured?: string; // 'true' or 'false'
}

export interface TourSearchOptions {
  countryId?: string;
  categoryId?: string;
  days?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class ToursService {
  constructor(
    @InjectModel(Tour.name) private tourModel: Model<Tour>,
  ) {}

  async create(createTourDto: CreateTourDto, userId: string): Promise<Tour> {
    const generatedSlug = slugify(createTourDto.title, { lower: true, strict: true });

    const existingTour = await this.tourModel.findOne({
      $or: [
        { title: createTourDto.title },
        { slug: generatedSlug }
      ],
    });

    if (existingTour) {
      throw new ConflictException("Tour with this title or slug already exists.");
    }

    const newTour = new this.tourModel({
      ...createTourDto,
      slug: generatedSlug,
      createdBy: userId,
      updatedBy: userId,
    });

    return newTour.save();
  }

  async findAll(options?: FindAllToursOptions): Promise<{
    tours: Tour[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  }> {
    const filter: any = {};
    const page = parseInt(options?.page || '1', 10);
    const limit = parseInt(options?.limit || '10', 10);
    const skip = (page - 1) * limit;

    if (options && options.search) {
      filter.$text = { $search: options.search };
    }

    if (options && options.status) {
      filter.status = options.status;
    }

    if (options && options.country && options.country !== 'all') {
      filter.countries = options.country;
    }

    if (options && options.category && options.category !== 'all') {
      filter.categories = options.category;
    }

    if (options && options.createdBy) {
      filter.createdBy = options.createdBy;
    }

    if (options && options.featured) {
      filter.isFeatured = options.featured === "true";
    }

    const totalDocs = await this.tourModel.countDocuments(filter).exec();
    const tours = await this.tourModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("countries", "name slug")
      .populate("categories", "name slug")
      .populate("createdBy", "name email")
      .exec();

    const totalPages = Math.ceil(totalDocs / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const nextPage = hasNextPage ? page + 1 : null;
    const prevPage = hasPrevPage ? page - 1 : null;

    return {
      tours,
      totalDocs,
      limit,
      totalPages,
      page,
      hasNextPage,
      hasPrevPage,
      nextPage,
      prevPage,
    };
  }

  async findFeatured(limit?: number): Promise<Tour[]> {
    const query = this.tourModel
      .find({ status: TourStatus.PUBLISHED })
      .sort({ days: -1 })
      .populate("countries", "name slug")
      .populate("categories", "name slug");

    if (limit) {
      query.limit(limit);
    }

    return await query.exec();
  }

  async findOne(id: string): Promise<Tour> {
    const tour = await this.tourModel
      .findById(id)
      .populate("countries", "name slug")
      .populate("categories", "name slug")
      .populate("createdBy", "name email")
      .exec();

    if (!tour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }

    return tour;
  }

  async findBySlug(slug: string): Promise<Tour> {
    const tour = await this.tourModel
      .findOne({ slug, status: TourStatus.PUBLISHED })
      .populate("countries", "name slug")
      .populate("categories", "name slug")
      .populate("createdBy", "name email")
      .exec();

    if (!tour) {
      throw new NotFoundException(`Tour with slug ${slug} not found`);
    }

    return tour;
  }

  async findByCountry(countryId: string): Promise<Tour[]> {
    try {
      const objectId = new Types.ObjectId(countryId);

      return await this.tourModel
        .find({ countries: objectId })
        .populate('countries', 'name slug code')
        .populate('categories', 'name slug')
        .select('title slug overview summary coverImage days price discountPrice')
        .sort({ days: -1 })
        .exec();
    } catch (error) {
      throw new NotFoundException(`Could not retrieve tours for country ID: ${countryId}`);
    }
  }

  /**
   * UPDATED: Finds all tours associated with a given category ID and optionally country IDs.
   * Supports both single country string or an array of country strings.
   */
  async findByCategory(
    categoryId: string,
    countryId?: string | string[], // Updated type to accept array
    limit?: number
  ): Promise<Tour[]> {
    try {
      const queryConditions: any = {
        categories: new Types.ObjectId(categoryId),
        status: TourStatus.PUBLISHED,
      };

      if (countryId) {
        if (Array.isArray(countryId)) {
          // Use $in operator to find tours matching ANY country in the list
          const objectIds = countryId.map(id => new Types.ObjectId(id));
          queryConditions.countries = { $in: objectIds };
        } else {
          queryConditions.countries = new Types.ObjectId(countryId);
        }
      }

      const query = this.tourModel
        .find(queryConditions)
        .sort({ days: -1 })
        .populate("countries", "name slug code")
        .populate("categories", "name slug")
        .select('title slug overview summary coverImage days price discountPrice');

      if (limit) {
        query.limit(limit);
      }

      return await query.exec();
    } catch (error) {
      throw new NotFoundException(`Could not retrieve tours for category ID: ${categoryId}`);
    }
  }

  async update(id: string, updateTourDto: UpdateTourDto, userId: string): Promise<Tour> {
    let slugToUpdate: string;

    if (updateTourDto.title) {
      slugToUpdate = slugify(updateTourDto.title, { lower: true, strict: true });
    } else {
      const existingTour = await this.tourModel.findById(id, { slug: 1 });
      if (!existingTour) {
        throw new NotFoundException(`Tour with ID ${id} not found.`);
      }
      slugToUpdate = existingTour.slug;
    }

    const existingTourWithSameSlug = await this.tourModel.findOne({
      slug: slugToUpdate,
      _id: { $ne: id },
    });

    if (existingTourWithSameSlug) {
      throw new ConflictException("Another tour with this slug already exists.");
    }

    const updatePayload: Record<string, any> = {
      ...updateTourDto,
      slug: slugToUpdate,
      updatedBy: userId,
    };

    const updatedTour = await this.tourModel
      .findOneAndUpdate({ _id: id }, updatePayload, { new: true })
      .exec();

    if (!updatedTour) {
      throw new NotFoundException(`Tour with ID ${id} not found.`);
    }

    return updatedTour;
  }

  async remove(id: string): Promise<Tour> {
    const deletedTour = await this.tourModel.findByIdAndDelete(id).exec();
    if (!deletedTour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }
    return deletedTour;
  }

  async toggleFeatured(id: string, userId: string): Promise<Tour> {
    const tour = await this.tourModel.findById(id).exec();
    if (!tour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }
    tour.isFeatured = !tour.isFeatured;
    tour.updatedBy = new Types.ObjectId(userId);
    return tour.save();
  }

  async updateStatus(id: string, status: TourStatus, userId: string): Promise<Tour> {
    const tour = await this.tourModel.findById(id).exec();
    if (!tour) {
      throw new NotFoundException(`Tour with ID ${id} not found`);
    }
    tour.status = status;
    tour.updatedBy = new Types.ObjectId(userId);
    return tour.save();
  }

  async findPopular(limit: number = 4): Promise<Tour[]> {
    return await this.tourModel
      .find({ status: TourStatus.PUBLISHED })
      .sort({ views: -1, createdAt: -1 })
      .limit(limit)
      .populate("countries", "name slug")
      .populate("categories", "name slug")
      .exec();
  }

  async incrementViews(slug: string): Promise<Tour> {
    return await this.tourModel.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } },
      { new: true }
    ).exec();
  }

  async searchTours(options: TourSearchOptions): Promise<{ tours: Tour[]; totalTours: number; page: number; limit: number; totalPages: number }> {
    const { countryId, categoryId, days, page = 1, limit = 10 } = options;

    const query: any = {
      status: TourStatus.PUBLISHED,
    };

    if (countryId) {
      if (!Types.ObjectId.isValid(countryId)) {
        throw new NotFoundException(`Invalid country ID format: ${countryId}`);
      }
      query.countries = new Types.ObjectId(countryId);
    }

    if (categoryId) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new NotFoundException(`Invalid category ID format: ${categoryId}`);
      }
      query.categories = new Types.ObjectId(categoryId);
    }

    if (days) {
      query.days = days;
    }

    const skip = (page - 1) * limit;

    const [tours, totalTours] = await Promise.all([
      this.tourModel
        .find(query)
        .populate('countries', 'name slug code')
        .populate('categories', 'name slug')
        .skip(skip)
        .limit(limit)
        .sort({ title: 1 })
        .exec(),
      this.tourModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalTours / limit);

    return {
      tours,
      totalTours,
      page,
      limit,
      totalPages,
    };
  }

  async searchForBlogs(q: string) {
    return this.tourModel
        .find({ title: { $regex: q, $options: 'i' }, status: 'published' })
        .select('title _id') // Only fetch what we need
        .limit(10)
        .exec();
}

async findByDestination(destinationId: string): Promise<Tour[]> {
  return this.tourModel
    .find({ destinations: destinationId }) // Ensure 'destinations' matches the field name in your Tour schema
    .populate('categories')                // Crucial for the JS filter to work
    .sort({ createdAt: -1 })
    .exec();
}
}