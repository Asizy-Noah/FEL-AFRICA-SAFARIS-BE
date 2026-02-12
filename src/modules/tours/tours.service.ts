// src/modules/tours/tours.service.ts

import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Tour, TourStatus } from "./schemas/tour.schema";
import { CreateTourDto } from "./dto/create-tour.dto";
import { UpdateTourDto } from "./dto/update-tour.dto";
import slugify from 'slugify'; // Make sure you have this installed: npm install slugify


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
  // Add other options like sortBy, sortOrder if needed
}

@Injectable()
export class ToursService {
  constructor(
    @InjectModel(Tour.name) private tourModel: Model<Tour>,
  ) {}

  async create(createTourDto: CreateTourDto, userId: string): Promise<Tour> {
    // ALWAYS GENERATE THE SLUG from the title, as it's not provided by the DTO.
    const generatedSlug = slugify(createTourDto.title, { lower: true, strict: true });

    // Check if a tour with the same title OR the newly generated slug already exists.
    const existingTour = await this.tourModel.findOne({
      $or: [
        { title: createTourDto.title }, // Check for duplicate title
        { slug: generatedSlug }         // Check for duplicate generated slug
      ],
    });

    if (existingTour) {
      throw new ConflictException("Tour with this title or slug already exists.");
    }

    // Create a new tour instance, spreading the DTO (which has no slug field)
    // and explicitly adding the backend-generated slug and user IDs.
    const newTour = new this.tourModel({
      ...createTourDto,
      slug: generatedSlug, // Assign the GENERATED slug here
      createdBy: userId,
      updatedBy: userId,
    });

    return newTour.save();
  }

  

  // Modified findAll to support pagination
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

    // Handle search query
    if (options && options.search) {
      filter.$text = { $search: options.search };
    }

    // Filter by status
    if (options && options.status) {
      filter.status = options.status;
    }

    // Filter by country (expects country ID)
    if (options && options.country && options.country !== 'all') { // Added 'all' check
      filter.countries = options.country;
    }

    // Filter by category (expects category ID)
    if (options && options.category && options.category !== 'all') { // Added 'all' check
      filter.categories = options.category;
    }

    // Filter by creator
    if (options && options.createdBy) {
      filter.createdBy = options.createdBy;
    }

    // Filter by featured
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
      // Change: Removed { isFeatured: true } condition
      .find({ status: TourStatus.PUBLISHED }) // <-- Now only filters by status: PUBLISHED
      .sort({ days: -1 })
      .populate("countries", "name slug")
      .populate("categories", "name slug");

    if (limit) {
      query.limit(limit);
    }

    const foundTours = await query.exec();
    
    

    return foundTours;
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

  /**
   * Finds all tours associated with a given country ID.
   * @param countryId The ID of the country to filter tours by.
   * @returns A promise that resolves to an array of Tour documents.
   */
  async findByCountry(countryId: string): Promise<Tour[]> {
    try {
      // Convert string ID to ObjectId for the query
      const objectId = new Types.ObjectId(countryId);

      const tours = await this.tourModel
        .find({ countries: objectId }) // Query tours where the 'countries' array contains the countryId
        .populate('countries', 'name slug code') // Populate relevant country fields
        .populate('categories', 'name slug')   // Populate relevant category fields
        .select('title slug overview summary coverImage days price discountPrice') // Select fields needed for the country page tour list
        .sort({ days: -1 }) // Optional: Sort tours alphabetically by title
        .exec();

      return tours;
    } catch (error) {
      
      throw new NotFoundException(`Could not retrieve tours for country ID: ${countryId}`);
    }
  }

  /**
   * Finds all tours associated with a given category ID and optionally a country ID.
   * @param categoryId The ID of the category to filter tours by.
   * @param countryId Optional: The ID of the country to further filter tours by.
   * @param limit Optional limit for the number of tours.
   * @returns A promise that resolves to an array of Tour documents.
   */
  async findByCategory(
    categoryId: string,
    countryId?: string, // <--- ADD OPTIONAL countryId PARAMETER
    limit?: number
  ): Promise<Tour[]> {
    try {
      const queryConditions: any = {
        categories: new Types.ObjectId(categoryId),
        status: TourStatus.PUBLISHED,
      };

      if (countryId) {
        queryConditions.countries = new Types.ObjectId(countryId); // <--- ADD COUNTRY FILTER IF PROVIDED
      }

      const query = this.tourModel
        .find(queryConditions) // Use the dynamic queryConditions
        .sort({ days: -1 })
        .populate("countries", "name slug code")
        .populate("categories", "name slug")
        .select('title slug overview summary coverImage days price discountPrice');

      if (limit) {
        query.limit(limit);
      }

      return query.exec();
    } catch (error) {
      throw new NotFoundException(`Could not retrieve tours for category ID: ${categoryId}`);
    }
  }


  async update(id: string, updateTourDto: UpdateTourDto, userId: string): Promise<Tour> {
    let slugToUpdate: string; // This variable will hold the slug to be used for the update.

    // Scenario 1: The title is being updated.
    // In this case, we MUST generate a new slug based on the new title.
    if (updateTourDto.title) {
      slugToUpdate = slugify(updateTourDto.title, { lower: true, strict: true });
    }
    // Scenario 2: The title is NOT being updated.
    // In this case, we need to preserve the *existing* slug of the tour.
    else {
      // Fetch the current tour's slug from the database.
      const existingTour = await this.tourModel.findById(id, { slug: 1 }); // Project only the 'slug' field for efficiency.

      if (!existingTour) {
        throw new NotFoundException(`Tour with ID ${id} not found.`);
      }
      slugToUpdate = existingTour.slug; // Use the existing slug.
    }

    // Perform a uniqueness check for the `slugToUpdate`.
    // This is crucial to ensure that even if the slug is regenerated or preserved,
    // it doesn't conflict with another *different* tour's slug.
    const existingTourWithSameSlug = await this.tourModel.findOne({
      slug: slugToUpdate,
      _id: { $ne: id }, // IMPORTANT: Exclude the current tour by its ID to avoid self-conflict.
    });

    if (existingTourWithSameSlug) {
      throw new ConflictException("Another tour with this slug already exists.");
    }

    // Construct the update payload.
    // It spreads the properties from `updateTourDto` (which doesn't contain 'slug'),
    // then explicitly adds the backend-determined `slug` and `updatedBy` field.
    const updatePayload: Record<string, any> = {
      ...updateTourDto, // This DTO will NOT contain 'slug'
      slug: slugToUpdate, // The backend-determined slug is added here.
      updatedBy: userId,  // Always update the 'updatedBy' field.
    };

    // Find the tour by its ID and update it with the constructed payload.
    const updatedTour = await this.tourModel
      .findOneAndUpdate({ _id: id }, updatePayload, { new: true }) // `new: true` returns the updated document.
      .exec();

    // If the tour was not found (e.g., invalid ID), throw an exception.
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

  // New method for popular tours
  async findPopular(limit: number = 4): Promise<Tour[]> { // Default limit to 4 if not provided
   
    const query = this.tourModel
      .find({ status: TourStatus.PUBLISHED }) // Only fetch published tours
      .sort({ views: -1, createdAt: -1 }) // Sort by views (desc), then by creation date (desc)
      .limit(limit)
      .populate("countries", "name slug")
      .populate("categories", "name slug");

    const popularTours = await query.exec();
    
    return popularTours;
  }

  // You might also want a method to increment views when a tour is viewed
  async incrementViews(slug: string): Promise<Tour> {
    return this.tourModel.findOneAndUpdate(
      { slug },
      { $inc: { views: 1 } }, // Increment the views field by 1
      { new: true } // Return the updated document
    ).exec();
  }

  // Search Tours
  async searchTours(options: TourSearchOptions): Promise<{ tours: Tour[]; totalTours: number; page: number; limit: number; totalPages: number }> {
    const { countryId, categoryId, days, page = 1, limit = 10 } = options;

    const query: any = {
      status: TourStatus.PUBLISHED, // Only search for published tours
    };

    if (countryId) {
      if (!Types.ObjectId.isValid(countryId)) {
        throw new NotFoundException(`Invalid country ID format: ${countryId}`);
      }
      // Assuming 'countries' in Tour schema is an array of ObjectId references
      query.countries = new Types.ObjectId(countryId);
    }

    if (categoryId) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw new NotFoundException(`Invalid category ID format: ${categoryId}`);
      }
      // Assuming 'categories' in Tour schema is an array of ObjectId references
      query.categories = new Types.ObjectId(categoryId);
    }

    if (days) {
      // Assuming 'days' is a direct match, or you might want a range (e.g., days <= X)
      query.days = days;
    }

    const skip = (page - 1) * limit;

    const [tours, totalTours] = await Promise.all([
      this.tourModel
        .find(query)
        .populate('countries', 'name slug code') // Populate relevant country fields
        .populate('categories', 'name slug') // Populate relevant category fields
        .skip(skip)
        .limit(limit)
        .sort({ title: 1 }) // Or sort by price, popularity, etc.
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
}