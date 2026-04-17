import { Injectable, NotFoundException, ConflictException, BadRequestException } from "@nestjs/common";
import { Model, Types } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { Blog, BlogStatus } from "./schemas/blog.schema";
import type { CreateBlogDto } from "./dto/create-blog.dto";
import type { UpdateBlogDto } from "./dto/update-blog.dto";
import { MailService } from "../mail/mail.service";
import { SubscribersService } from "../subscribers/subscribers.service";
import { Tour } from '../tours/schemas/tour.schema'; // Adjust paths as needed
import { Country } from '../countries/schemas/country.schema';
import { Category } from '../categories/schemas/category.schema';

// Define a more flexible type for the query options to allow Mongoose operators
interface BlogFindAllOptions {
    search?: string;
    status?: BlogStatus | 'all'; // Allow 'all' for status filtering in controller
    country?: string; // Expecting country ID
    category?: string; // Expecting category ID
    author?: string; // Expecting author ID (from controller)
    tag?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
    // Allow Mongoose logical operators like $or to be passed directly
    $or?: any[];
    [key: string]: any; // Allows for additional dynamic properties like direct filters
}


@Injectable()
export class BlogsService {
    constructor(
        @InjectModel(Blog.name) private blogModel: Model<Blog>,
        private mailService: MailService,
        private subscribersService: SubscribersService,
    ) {}

    async create(createBlogDto: CreateBlogDto, userId: string): Promise<Blog> {
    // 1. Generate Slug if missing
    if (!createBlogDto.slug) {
        createBlogDto.slug = createBlogDto.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
    }

    // 2. Check for duplicates
    const existingBlog = await this.blogModel.findOne({
        $or: [{ title: createBlogDto.title }, { slug: createBlogDto.slug }],
    });

    if (existingBlog) {
        // Append a random string to slug if it exists to prevent 400 errors
        createBlogDto.slug = `${createBlogDto.slug}-${Math.floor(Math.random() * 1000)}`;
    }

    // 3. Save to Database
    const newBlog = new this.blogModel({
        ...createBlogDto,
        author: userId,
        updatedBy: userId,
    });

    const savedBlog = await newBlog.save();

    // 4. Newsletter logic
    if (savedBlog.status === BlogStatus.VISIBLE) {
        try {
            // const subscribers = await this.subscribersService.findAll();
            // await this.mailService.sendNewBlogNotification(savedBlog, subscribers);
        } catch (e) {
            console.error("Mail Error:", e);
        }
    }

    return savedBlog;
}

    async findAll(queryOptions?: BlogFindAllOptions): Promise<{ blogs: Blog[]; totalBlogs: number; currentPage: number; totalPages: number }> {
        const filter: any = {};
        const sort: any = {};

        // Parse pagination parameters, ensuring they are numbers
        const page = queryOptions?.page ? parseInt(queryOptions.page.toString(), 10) : 1;
        const limit = queryOptions?.limit ? parseInt(queryOptions.limit.toString(), 10) : 10;
        const skip = (page - 1) * limit;

        // Apply filters directly from queryOptions, if they exist and are not internal ones like 'search', 'sortBy', 'page', 'limit'
        for (const key in queryOptions) {
            if (queryOptions.hasOwnProperty(key) && !['search', 'sortBy', 'page', 'limit'].includes(key)) {
                // Handle Mongoose operators like $or directly
                if (key.startsWith('$')) {
                    filter[key] = queryOptions[key];
                } else if (key === 'status' && queryOptions[key] !== 'all') {
                    // Specific handling for status if 'all' is passed
                    filter[key] = queryOptions[key];
                } else if (key === 'author' || key === 'category' || key === 'country') {
                    // Handle ObjectId conversions for specific fields
                    if (Types.ObjectId.isValid(queryOptions[key])) {
                        filter[key] = new Types.ObjectId(queryOptions[key] as string);
                    }
                } else if (key === 'tag') {
                    // Handle tag filtering
                    filter.tags = queryOptions[key];
                } else {
                    // For any other direct filters passed from controller
                    filter[key] = queryOptions[key];
                }
            }
        }

        // Handle specific search query logic from the controller
        // The controller should ideally build '$or' and pass it in 'filters'
        // If the controller is passing 'search' directly to the service, use $text for full-text search
        // OR build $or based on specific fields here.
        // Assuming controller already transforms 'search' into '$or' for most cases.
        // If queryOptions.search exists, and $or wasn't already built, add a default text search.
        if (queryOptions?.search && !filter.$or) {
             filter.$or = [
                { title: { $regex: queryOptions.search, $options: 'i' } },
                { excerpt: { $regex: queryOptions.search, $options: 'i' } },
                { content: { $regex: queryOptions.search, $options: 'i' } }
             ];
        }


        // Handle sorting options
        switch (queryOptions?.sortBy) {
            case 'oldest':
                sort.createdAt = 1;
                break;
            case 'title-asc':
                sort.title = 1;
                break;
            case 'title-desc':
                sort.title = -1;
                break;
            case 'newest': // Default
            default:
                sort.createdAt = -1;
                break;
        }

        const [blogs, totalBlogs] = await Promise.all([
            this.blogModel
                .find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .populate("author", "name email")
                .exec(),
            this.blogModel.countDocuments(filter).exec(),
        ]);

        const totalPages = Math.ceil(totalBlogs / limit);

        return {
            blogs,
            totalBlogs,
            currentPage: page,
            totalPages,
        };
    }

    async findPublished(limit?: number): Promise<Blog[]> {
        const query = this.blogModel
            .find({ status: BlogStatus.VISIBLE })
            .sort({ createdAt: -1 })
            .populate("author", "name email");

        if (limit) {
            query.limit(limit);
        }

        return query.exec();
    }

    async findOne(id: string): Promise<any> {
    const blog = await this.blogModel.findById(id).populate("author", "name email").lean().exec();
    if (!blog) throw new NotFoundException(`Blog with ID ${id} not found.`);
    if (!blog.sections || blog.sections.length === 0) return blog;

    for (const [index, section] of (blog.sections as any[]).entries()) {
        if (section.attachedItems && section.attachedItems.length > 0) {
            const hydratedItems = [];
            for (const itemId of section.attachedItems) {
                const actualId = typeof itemId === 'object' ? (itemId.id || itemId._id) : itemId;
                const [tour, country, category, destination, page, linkedBlog] = await Promise.all([
                    this.blogModel.db.model('Tour').findById(actualId).select('title').lean().exec(),
                    this.blogModel.db.model('Country').findById(actualId).select('name').lean().exec(),
                    this.blogModel.db.model('Category').findById(actualId).select('name').lean().exec(),
                    this.blogModel.db.model('Destination').findById(actualId).select('name').lean().exec(),
                    this.blogModel.db.model('Page').findById(actualId).select('title').lean().exec(),
                    this.blogModel.findById(actualId).select('title').lean().exec(),
                ]);

                let detectedType = 'category'; 
                if (tour) detectedType = 'tour';
                else if (country) detectedType = 'country';
                else if (destination) detectedType = 'destination';
                else if (page) detectedType = 'page';
                else if (linkedBlog) detectedType = 'blog';

                const name = (tour as any)?.title || (page as any)?.title || (linkedBlog as any)?.title || (country as any)?.name || (category as any)?.name || (destination as any)?.name || "Unknown Item";
                hydratedItems.push({ id: actualId, text: name, type: detectedType });
            }
            section.attachedItems = hydratedItems;
        }

        if (section.type === 'tour' || section.type === 'page') {
            let itemIds = [];
            if (section.referenceId) itemIds.push(section.referenceId);
            if (section.tourId) itemIds.push(section.tourId);
            if (section.pageId) itemIds.push(section.pageId);
            if (section.attachedItems) {
                const extraIds = section.attachedItems.map(item => typeof item === 'object' ? item.id : item);
                itemIds = [...itemIds, ...extraIds];
            }
            const uniqueIds = [...new Set(itemIds.map(id => typeof id === 'object' ? (id.id || id._id) : id))];
            if (uniqueIds.length > 0) {
                const modelName = section.type === 'tour' ? 'Tour' : 'Page';
                section.referenceId = await Promise.all(uniqueIds.map(async (finalId) => {
                    const data = await this.blogModel.db.model(modelName).findById(finalId).select('title name').lean().exec();
                    return { id: finalId, text: (data as any)?.title || (data as any)?.name || "Linked Item", type: section.type };
                }));
            }
        }
    }
    return blog;
}

    async findBySlug(slug: string): Promise<Blog> {
        const blog = await this.blogModel
            .findOne({ slug})
            .populate("author", "name email")
            .exec();

        

        return blog;
    }

    async update(id: string, updateBlogDto: UpdateBlogDto, userId: string): Promise<Blog> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ID format for blog update: ${id}`);
        }

        if (updateBlogDto.slug) {
            const existingBlog = await this.blogModel.findOne({
                slug: updateBlogDto.slug,
                _id: { $ne: id },
            });

            if (existingBlog) {
                throw new ConflictException("Blog with this slug already exists.");
            }
        }

        const blog = await this.blogModel.findById(id).exec();

        if (!blog) {
            throw new NotFoundException(`Blog with ID ${id} not found.`);
        }

        if (updateBlogDto.tags && typeof updateBlogDto.tags === 'string') {
            updateBlogDto.tags = (updateBlogDto.tags as string).split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } else if (updateBlogDto.tags === null || updateBlogDto.tags === undefined) {
            updateBlogDto.tags = [];
        }

        const processedUpdateDto: any = { ...updateBlogDto };

        const isPublishing = blog.status !== BlogStatus.VISIBLE && processedUpdateDto.status === BlogStatus.VISIBLE;

        Object.assign(blog, processedUpdateDto);
        blog.updatedBy = new Types.ObjectId(userId);
        const updatedBlog = await blog.save();

        if (isPublishing) {
            const subscribers = await this.subscribersService.findAll();
            // await this.mailService.sendNewBlogNotification(updatedBlog, subscribers);
        }

        return updatedBlog;
    }

    async remove(id: string): Promise<Blog> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ID format for blog deletion: ${id}`);
        }
        const deletedBlog = await this.blogModel.findByIdAndDelete(id).exec();

        if (!deletedBlog) {
            throw new NotFoundException(`Blog with ID ${id} not found.`);
        }

        return deletedBlog;
    }

    async updateStatus(id: string, status: BlogStatus, userId: string): Promise<Blog> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`Invalid ID format for status update: ${id}`);
        }
        const blog = await this.blogModel.findById(id).exec();

        if (!blog) {
            throw new NotFoundException(`Blog with ID ${id} not found.`);
        }

        const isPublishing = blog.status !== BlogStatus.VISIBLE && status === BlogStatus.VISIBLE;

        blog.status = status;
        blog.updatedBy = new Types.ObjectId(userId);
        const updatedBlog = await blog.save();

        if (isPublishing) {
            const subscribers = await this.subscribersService.findAll();
            // await this.mailService.sendNewBlogNotification(updatedBlog, subscribers);
        }

        return updatedBlog;
    }

    /**
   * Finds popular blogs based on views.
   * @param limit The maximum number of popular blogs to return.
   * @returns A promise that resolves to an array of popular Blog documents.
   */
  async findPopular(limit: number = 5): Promise<Blog[]> {
    try {
      const blogs = await this.blogModel
        .find({ status: BlogStatus.VISIBLE }) // Only visible blogs
        .sort({ views: -1, createdAt: -1 }) // Sort by views (desc), then by newest (desc)
        .limit(limit)
        .populate('sections')
        .select('title slug coverImage excerpt createdAt') // Select fields needed for card/list
        .exec();
      return blogs;
    } catch (error) {
      console.error(`[BlogsService] Error retrieving popular blogs:`, error);
      // Depending on how critical this is, you might re-throw or return an empty array
      return [];
    }
  }

  /**
   * Increments the views count for a given blog slug.
   * @param slug The slug of the blog to increment views for.
   */
  async incrementViews(slug: string): Promise<void> {
    try {
      await this.blogModel.findOneAndUpdate(
        { slug, status: BlogStatus.VISIBLE },
        { $inc: { views: 1 } }, // Increment the 'views' field by 1
        { new: true } // Return the updated document (optional, but good for validation)
      ).exec();
    } catch (error) {
      console.error(`[BlogsService] Error incrementing views for blog slug ${slug}:`, error);
      // Don't throw a major error for view increment failures; it's a background task.
    }
  }

  async searchForBlogs(q: string) {
    return this.blogModel
        .find({ title: { $regex: q, $options: 'i' }, status: 'visible' })
        .select('title _id')
        .limit(10)
        .exec();
}

async getBlogDetailsForPublic(slug: string) {
    // 1. Fetch the main blog
    const blog = await this.blogModel.findOne({ slug, status: BlogStatus.VISIBLE })
        .populate('categories countries author sections.tourId sections.pageId sections.relatedBlogId sections.destinationId sections.categoryId sections.countryId')
        .exec();

    if (!blog) return null;

    // 2. Iterate through sections to handle Standalone Blocks and Paragraph Attachments
    for (const section of blog.sections) {
        
        // --- FIX STANDALONE BLOCKS (Embedded Tours/Pages) ---
        // If the section is a tour/page but tourId/pageId is empty, try to fetch using referenceId
        if (section.referenceId) {
            try {
                if (section.type === 'tour' && !section.tourId) {
                    section.tourId = await this.blogModel.db.model('Tour').findById(section.referenceId).lean();
                } else if (section.type === 'page' && !section.pageId) {
                    section.pageId = await this.blogModel.db.model('Page').findById(section.referenceId).lean();
                }
            } catch (e) {
                console.error(`Failed to fetch standalone reference: ${section.referenceId}`, e);
            }
        }

        // --- FIX PARAGRAPH ATTACHMENTS ---
        if (section.attachedItems && section.attachedItems.length > 0) {
            // Filter out any null/undefined IDs to prevent query errors
            const validIds = section.attachedItems.filter(id => id);

            const [tours, blogs, destinations, cats, countries, pages] = await Promise.all([
                this.blogModel.db.model('Tour').find({ _id: { $in: validIds } }).lean(),
                this.blogModel.db.model('Blog').find({ _id: { $in: validIds } }).lean(),
                this.blogModel.db.model('Destination').find({ _id: { $in: validIds } }).lean(),
                this.blogModel.db.model('Category').find({ _id: { $in: validIds } }).lean(),
                this.blogModel.db.model('Country').find({ _id: { $in: validIds } }).lean(),
                this.blogModel.db.model('Page').find({ _id: { $in: validIds } }).lean(),
            ]);

            // Map them into a single array for EJS rendering
            (section as any).resolvedAttachments = [
                ...tours.map(i => ({ ...i, type: 'tour' })),
                ...blogs.map(i => ({ ...i, type: 'blog' })),
                ...destinations.map(i => ({ ...i, type: 'destination' })),
                ...cats.map(i => ({ ...i, type: 'category' })),
                ...countries.map(i => ({ ...i, type: 'country' })),
                ...pages.map(i => ({ ...i, type: 'page' })),
            ];
        }
    }

    // 3. Fetch Navigation and Related Data
    const prevBlog = await this.blogModel.findOne({ 
        createdAt: { $lt: (blog as any).createdAt }, 
        status: BlogStatus.VISIBLE 
    }).sort({ createdAt: -1 }).select('title slug').lean();

    const nextBlog = await this.blogModel.findOne({ 
        createdAt: { $gt: (blog as any).createdAt }, 
        status: BlogStatus.VISIBLE 
    }).sort({ createdAt: 1 }).select('title slug').lean();

    const relatedBlogs = await this.blogModel.find({ 
        status: BlogStatus.VISIBLE, 
        categories: { $in: blog.categories.map(c => (c as any)._id || c) }, 
        _id: { $ne: blog._id } 
    }).limit(3).lean();

    return { blog, prevBlog, nextBlog, relatedBlogs };
}
}