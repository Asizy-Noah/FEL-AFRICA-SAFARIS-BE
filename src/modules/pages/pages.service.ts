import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";

import { Page, PageStatus, PageType } from "./schemas/page.schema"; // Import PageType
import { CreatePageDto } from "./dto/create-page.dto";
import { UpdatePageDto } from "./dto/update-page.dto";

@Injectable()
export class PagesService {
  constructor(
    @InjectModel(Page.name) private pageModel: Model<Page>,
  ) {}

  async create(createPageDto: CreatePageDto, userId: string): Promise<Page> {
    // Check if page with same title or slug already exists
    const existingPage = await this.pageModel.findOne({
      $or: [{ title: createPageDto.title }, { slug: createPageDto.slug }],
    });

    if (existingPage) {
      throw new ConflictException("Page with this title or slug already exists");
    }

    const newPage = new this.pageModel({
      ...createPageDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return newPage.save();
  }

  async findAll(query?: any): Promise<{ pages: Page[]; totalPages: number; currentPage: number }> {
    const filter: any = {};
    const page = parseInt(query.page as string, 10) || 1;
    const limit = parseInt(query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    // Handle search query across relevant fields
    if (query && query.search) {
        filter.$or = [
            { title: { $regex: query.search, $options: 'i' } },
            { description: { $regex: query.search, $options: 'i' } },
            { seoKeywords: { $regex: query.search, $options: 'i' } },
            // Search within content blocks
            { 'contentBlocks.title': { $regex: query.search, $options: 'i' } },
            { 'contentBlocks.content': { $regex: query.search, $options: 'i' } },
        ];
    }

    // Filter by status
    if (query && query.status && Object.values(PageStatus).includes(query.status)) {
        filter.status = query.status;
    }

    // Filter by page type (if you add a filter for it in the dashboard)
    if (query && query.pageType && Object.values(PageType).includes(query.pageType)) {
        filter.pageType = query.pageType;
    }

    const totalPagesCount = await this.pageModel.countDocuments(filter);
    const pages = await this.pageModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .exec();

    return {
      pages,
      totalPages: Math.ceil(totalPagesCount / limit),
      currentPage: page,
    };
  }

  async findPublished(): Promise<Page[]> {
    return this.pageModel
      .find({ status: PageStatus.PUBLISHED })
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .exec();
  }

  async findOne(id: string): Promise<Page> {
    if (!Types.ObjectId.isValid(id)) { // Basic validation for ObjectId
        throw new BadRequestException('Invalid ID format');
    }
    const page = await this.pageModel.findById(id).populate("createdBy", "name email").exec();

    if (!page) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }

    return page;
  }

  async findBySlug(slug: string): Promise<Page> {
    const page = await this.pageModel
      .findOne({ slug, status: PageStatus.PUBLISHED })
      .populate("createdBy", "name email")
      .exec();

    if (!page) {
      throw new NotFoundException(`Page with slug ${slug} not found or not published`);
    }

    return page;
  }

  async update(id: string, updatePageDto: UpdatePageDto, userId: string): Promise<Page> {
    if (!Types.ObjectId.isValid(id)) { // Basic validation for ObjectId
        throw new BadRequestException('Invalid ID format');
    }

    // Check if updating to a slug that already exists for a different page
    if (updatePageDto.slug) {
      const existingPage = await this.pageModel.findOne({
        slug: updatePageDto.slug,
        _id: { $ne: id }, // Exclude the current page
      });

      if (existingPage) {
        throw new ConflictException("Page with this slug already exists");
      }
    }

    const page = await this.pageModel.findById(id).exec();

    if (!page) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }

    // Directly assign DTO properties
    Object.assign(page, updatePageDto);
    page.updatedBy = new Types.ObjectId(userId) as any;

    return page.save();
  }

  async remove(id: string): Promise<Page> {
    if (!Types.ObjectId.isValid(id)) { // Basic validation for ObjectId
        throw new BadRequestException('Invalid ID format');
    }
    const deletedPage = await this.pageModel.findByIdAndDelete(id).exec();

    if (!deletedPage) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }

    return deletedPage;
  }

  async findOneByType(type: PageType): Promise<Page | null> {
    return this.pageModel.findOne({
      pageType: type,
      status: PageStatus.PUBLISHED, // <-- ADD THIS LINE to filter by published status
    }).exec();
  }

  // If you also need to find by slug for generic pages:
  async findOneBySlug(slug: string): Promise<Page | null> {
    return this.pageModel.findOne({ slug: slug }).exec();
  }

  // You might want a slug generation helper if not already in DTO/Controller
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  }

  async updateStatus(id: string, status: PageStatus, userId: string): Promise<Page> {
    if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid ID format');
    }
    if (!Object.values(PageStatus).includes(status)) {
        throw new BadRequestException(`Invalid status provided: ${status}`);
    }

    // Use findByIdAndUpdate to only update the 'status' and 'updatedBy' fields.
    // { new: true } returns the updated document.
    // { runValidators: true } ensures only validators for 'status' and 'updatedBy' run (if any).
    // This will *not* trigger validation for the entire contentBlocks array.
    const updatedPage = await this.pageModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: status,
          updatedBy: new Types.ObjectId(userId) // Ensure userId is a valid ObjectId
        }
      },
      { new: true } // Return the updated document
    ).exec();

    if (!updatedPage) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }

    return updatedPage;
  }
}