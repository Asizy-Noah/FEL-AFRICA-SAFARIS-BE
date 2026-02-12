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
   * @param query An object containing search string, page number, limit, and countryId.
   * @returns An object with paginated category data and pagination info.
   */
  async findAll(query: { search?: string; page?: string; limit?: string; countryId?: string } = {}): Promise<{ // ADD countryId here
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { search, page = '1', limit = '6', countryId } = query; // Destructure countryId
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filter: any = {};
    if (search) {
      filter.$text = { $search: search };
    }
    if (countryId && countryId !== "all") { // Add filtering by countryId
      filter.country = countryId; // Assuming 'country' is the field in your Category schema
    }

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(parsedLimit)
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
    const category = await this.categoryModel.findById(id).populate("createdBy", "name email").exec();

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found.`);
    }

    return category;
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.categoryModel
      .findOne({ slug })
      .sort({ time: 1 })
      .populate('country', 'name slug code') // <--- ADD THIS POPULATE LINE
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
      .findByIdAndUpdate(id, { ...updateCategoryDto, updatedBy: userId }, { new: true })
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
   * @param countryId The ID of the country to filter categories by.
   * @returns A promise that resolves to an array of Category documents.
   */
  async findByCountry(countryId: string): Promise<Category[]> {
    // --- IMPORTANT: Validate countryId is a valid ObjectId format first ---
    if (!Types.ObjectId.isValid(countryId)) {
      
      throw new NotFoundException(`Invalid country ID format: ${countryId}`);
    }

    try {
      
      const categories = await this.categoryModel
        // <<< CRITICAL CORRECTION: Use only one .find() with new Types.ObjectId()
        .find({ country: new Types.ObjectId(countryId) })
        .populate('country', 'name slug') // Populate country details if needed
        .select('name slug image') // Only select necessary fields (name and slug for dropdown)
        .sort({ createdAt: 1 }) 
        .exec(); 

      
      return categories;
    } catch (error) {
      console.error(`[CategoriesService] Error retrieving categories for country ID ${countryId}:`, error);
      throw new NotFoundException(`Could not retrieve categories for country ID: ${countryId}`);
    }
  }
}