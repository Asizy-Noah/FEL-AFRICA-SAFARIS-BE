// src/modules/countries/countries.service.ts
import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Country } from "./schemas/country.schema";
import type { CreateCountryDto } from "./dto/create-country.dto";
import type { UpdateCountryDto } from "./dto/update-country.dto";
import slugify from "slugify"; // Import slugify

@Injectable()
export class CountriesService {
  constructor(
    @InjectModel(Country.name) private countryModel: Model<Country>,
  ) {}

  /**
   * Generates a URL-friendly slug from a given string.
   * @param text The string to slugify.
   * @returns The generated slug.
   */
  generateSlug(text: string): string {
    return slugify(text, { lower: true, strict: true });
  }

  async create(createCountryDto: CreateCountryDto, userId: string): Promise<Country> {
    // Ensure slug is generated if not provided
    if (!createCountryDto.slug) {
      createCountryDto.slug = this.generateSlug(createCountryDto.name);
    }

    // Check if country with same name or slug already exists
    const existingCountry = await this.countryModel.findOne({
      $or: [{ name: createCountryDto.name }, { slug: createCountryDto.slug }],
    });

    if (existingCountry) {
      throw new ConflictException("Country with this name or slug already exists.");
    }

    const newCountry = new this.countryModel({
      ...createCountryDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return newCountry.save();
  }

  /**
   * Finds all countries with optional search, pagination, and sorting.
   * @param query An object containing search string, page number, and limit.
   * @returns An object with paginated country data and pagination info.
   */
  async findAll(query: { search?: string; page?: string; limit?: string } = {}): Promise<{
    data: Country[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { search, page = '1', limit = '20' } = query; // Default limit to 6 for the dashboard grid
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const filter: any = {};
    if (search) {
      // Use the text index defined in your schema for search
      // Assuming you have a text index on 'name' or 'description' for Country schema
      filter.$text = { $search: search };
    }

    // Use Promise.all to fetch countries and total count concurrently
    const [countries, total] = await Promise.all([
      this.countryModel
        .find(filter)
        .sort({ createdAt: 1 }) // Sort by creation date, newest first
        .skip(skip)
        .limit(parsedLimit)
        .populate("createdBy", "name email")
        .exec(),
      this.countryModel.countDocuments(filter).exec(), // Get total count of documents matching the filter
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    return {
      data: countries,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages,
    };
  }

  /**
   * Finds all public countries for sitemap generation.
   * @returns An array of Country documents.
   */
  async findAllForSitemap(): Promise<Country[]> {
    // You might want to add a filter here if not all countries should be in the sitemap
    // For example, if you have a 'isPublished: true' field
    return this.countryModel
      .find({ /* isPublished: true */ }) // Add any necessary filters for public content
      .select('slug updatedAt') // Only fetch necessary fields for sitemap
      .exec();
  }

  async findOne(id: string): Promise<Country> {
    const country = await this.countryModel.findById(id).populate("createdBy", "name email").exec();

    if (!country) {
      throw new NotFoundException(`Country with ID ${id} not found.`);
    }

    return country;
  }

  async findBySlug(slug: string): Promise<Country> {
    const country = await this.countryModel.findOne({ slug }).populate("createdBy", "name email").exec();

    if (!country) {
      throw new NotFoundException(`Country with slug ${slug} not found.`);
    }

    return country;
  }

  async update(id: string, updateCountryDto: UpdateCountryDto, userId: string): Promise<Country> {
    // If name is updated and slug is not explicitly provided, re-generate slug
    if (updateCountryDto.name && !updateCountryDto.slug) {
      updateCountryDto.slug = this.generateSlug(updateCountryDto.name);
    }

    // Check if updating to a slug that already exists (excluding the current country)
    if (updateCountryDto.slug) {
      const existingCountry = await this.countryModel.findOne({
        slug: updateCountryDto.slug,
        _id: { $ne: id }, // Exclude the current document being updated
      });

      if (existingCountry) {
        throw new ConflictException("Country with this slug already exists.");
      }
    }

    const updatedCountry = await this.countryModel
      .findByIdAndUpdate(id, { ...updateCountryDto, updatedBy: userId }, { new: true }) // `new: true` returns the updated document
      .exec();

    if (!updatedCountry) {
      throw new NotFoundException(`Country with ID ${id} not found.`);
    }

    return updatedCountry;
  }

  async remove(id: string): Promise<Country> {
    const deletedCountry = await this.countryModel.findByIdAndDelete(id).exec();

    if (!deletedCountry) {
      throw new NotFoundException(`Country with ID ${id} not found.`);
    }

    return deletedCountry;
  }

  // --- NEW METHODS FOR HEADER COUNTRIES ---

  /**
   * Fetches the four static countries (Uganda, Kenya, Rwanda, Tanzania) by name.
   * Ensures they are always retrieved if they exist.
   * @returns An array of Country documents for the static list.
   */
  async findStaticHeaderCountries(): Promise<Country[]> {
    const staticCountryNames = ["Uganda", "Kenya", "Rwanda", "Tanzania"];
    const countries = await this.countryModel.find({
      name: { $in: staticCountryNames }
    })
    .select('name code slug')
    .sort({ createdAt: 1 }) // Only fetch necessary fields for the header
    .exec();
    return countries;
  }

  /**
   * Fetches all other countries excluding the four static ones.
   * @returns An array of Country documents for the dropdown list.
   */
  async findOtherHeaderCountries(): Promise<Country[]> {
    const staticCountryNames = ["Uganda", "Kenya", "Rwanda", "Tanzania"];
    const countries = await this.countryModel.find({
      name: { $nin: staticCountryNames } // $nin means "not in"
    })
    .select('name code slug')
    .sort({ createdAt: 1 }) // Only fetch necessary fields for the header
    .exec();
    return countries;
  }
}