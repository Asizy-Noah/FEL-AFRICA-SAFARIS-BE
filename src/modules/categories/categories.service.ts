// src/modules/categories/categories.service.ts
import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Category } from "./schemas/category.schema";
import type { CreateCategoryDto } from "./dto/create-category.dto";
import type { UpdateCategoryDto } from "./dto/update-category.dto";
import slugify from "slugify";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  generateSlug(text: string): string {
    return slugify(text, { lower: true, strict: true });
  }

  async create(createCategoryDto: CreateCategoryDto, userId: string): Promise<Category> {
    if (!createCategoryDto.slug) {
      createCategoryDto.slug = this.generateSlug(createCategoryDto.name);
    }

    const existingCategory = await this.categoryModel.findOne({
      $or: [{ name: createCategoryDto.name }, { slug: createCategoryDto.slug }],
    });

    if (existingCategory) {
      throw new ConflictException("Category with this name or slug already exists.");
    }

    const newCategory = new this.categoryModel({
      ...createCategoryDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return newCategory.save();
  }

  /**
   * Finds all categories with optional search, pagination, and sorting, and countryId filtering.
   */
  async findAll(query: { search?: string; page?: string; limit?: string; countryId?: string } = {}): Promise<{
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { search, page = '1', limit = '10', countryId } = query;
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filter: any = {};
    if (search) {
      filter.$text = { $search: search };
    }
    
    // Updated to check if countryId exists within the countries array
    if (countryId && countryId !== "all") {
      filter.countries = new Types.ObjectId(countryId);
    }

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ createdAt: -1 }) // Sort by newest first
        .skip(skip)
        .limit(parsedLimit)
        .populate("countries", "name slug") // Populate the array of countries
        .populate("createdBy", "name email")
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    return {
      data: categories,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Category> {
    // Check if ID is valid to prevent Mongoose casting errors
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Invalid ID format: ${id}`);
    }

    const category = await this.categoryModel
      .findById(id)
      .populate("countries", "name slug") // Populate countries for the Edit form tags
      .populate("createdBy", "name email")
      .exec();

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found.`);
    }

    return category;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryModel
      .findOne({ slug })
      .populate('countries', 'name slug code') // Updated from 'country' to 'countries'
      .exec();
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId: string): Promise<Category> {
    if (updateCategoryDto.name && !updateCategoryDto.slug) {
      updateCategoryDto.slug = this.generateSlug(updateCategoryDto.name);
    }

    if (updateCategoryDto.slug) {
      const existingCategory = await this.categoryModel.findOne({
        slug: updateCategoryDto.slug,
        _id: { $ne: id },
      });

      if (existingCategory) {
        throw new ConflictException("Category with this slug already exists.");
      }
    }

    const updatedCategory = await this.categoryModel
      .findByIdAndUpdate(
        id, 
        { ...updateCategoryDto, updatedBy: userId }, 
        { new: true }
      )
      .populate("countries", "name slug")
      .exec();

    if (!updatedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found.`);
    }

    return updatedCategory;
  }

  async remove(id: string): Promise<Category> {
    const deletedCategory = await this.categoryModel.findByIdAndDelete(id).exec();

    if (!deletedCategory) {
      throw new NotFoundException(`Category with ID ${id} not found.`);
    }

    return deletedCategory;
  }

  /**
   * Finds all categories associated with a given country ID.
   */
  async findByCountry(countryId: string): Promise<Category[]> {
    if (!Types.ObjectId.isValid(countryId)) {
      throw new NotFoundException(`Invalid country ID format: ${countryId}`);
    }

    try {
      const categories = await this.categoryModel
        // Using $in to find categories where the provided ID exists in the countries array
        .find({ countries: { $in: [new Types.ObjectId(countryId)] } })
        .populate('countries', 'name slug')
        .select('name slug image description')
        .sort({ createdAt: 1 }) 
        .exec(); 

      return categories;
    } catch (error) {
      console.error(`[CategoriesService] Error retrieving categories for country ID ${countryId}:`, error);
      throw new NotFoundException(`Could not retrieve categories for country ID: ${countryId}`);
    }
  }

  async findByCountries(countryIds: string[]): Promise<Category[]> {
  return this.categoryModel
    .find({ countries: { $in: countryIds } }) // Use 'countries' if it's an array in schema
    .sort({ name: 1 })
    .exec();
}


async searchForBlogs(q: string) {
    return this.categoryModel // or this.categoryModel, etc.
        .find({ name: { $regex: q, $options: 'i' } })
        .select('name _id')
        .limit(10)
        .exec();
}
}