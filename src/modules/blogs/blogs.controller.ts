import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Req,
    Res,
    Render,
    UseInterceptors,
    UploadedFile,
    Query,
    HttpException,
    HttpStatus,
    Patch,
    Delete,
    NotFoundException,
    BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { BlogsService } from "./blogs.service";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { UpdateBlogDto } from "./dto/update-blog.dto";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { UserRole } from "../users/schemas/user.schema";
import { TourStatus } from '../tours/schemas/tour.schema';
import { BlogStatus } from "./schemas/blog.schema";
import { getMulterConfig } from '../../config/multer.config';
import { CountriesService } from "../countries/countries.service";
import { ToursService } from '../tours/tours.service';
import { CategoriesService } from "../categories/categories.service";
import { DestinationsService } from "../destinations/destinations.service";
import { PagesService } from "../pages/pages.service";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { LocalStorageService } from '../google-cloud/local-storage.service';

// Define interfaces for clarity
interface PublicBlogsQuery {
    search?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    category?: string;
    tag?: string;
}

interface DashboardBlogsQuery {
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
    sortBy?: string;
    category?: string;
    country?: string;
    tag?: string;
}

@Controller("blogs")
export class BlogsController {
    constructor(
        private readonly blogsService: BlogsService,
    private readonly toursService: ToursService,
    private readonly countriesService: CountriesService,
    private readonly categoriesService: CategoriesService,
    private readonly destinationsService: DestinationsService, // Add this
    private readonly pagesService: PagesService,
        private readonly localStorageService: LocalStorageService,
    ) {}


    // ===============================================
    // DASHBOARD BLOG ROUTES
    // ===============================================

    @Get("dashboard/blogs")
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.AGENT)
    // REMOVED @Render decorator here to prevent double-rendering
    async getDashboardBlogs(@Query() query: DashboardBlogsQuery, @Req() req, @Res() res: Response) {
        const safeQuery = {
            status: query.status || 'all',
            search: query.search || '',
            sortBy: query.sortBy || 'newest',
            page: query.page || '1',
        };

        try {
            const filters: any = {};
            const page = parseInt(safeQuery.page as string, 10) || 1;
            const limit = 10;

            if (safeQuery.status !== 'all') {
                filters.status = safeQuery.status;
            }

            if (safeQuery.search) {
                filters.$or = [
                    { title: { $regex: safeQuery.search, $options: 'i' } },
                    { content: { $regex: safeQuery.search, $options: 'i' } }
                ];
            }

            if (req.user.role === UserRole.AGENT) {
                filters.author = req.user.id;
            }

            const { blogs, totalBlogs, currentPage, totalPages } = await this.blogsService.findAll({
                ...filters,
                page,
                limit,
                sortBy: safeQuery.sortBy,
            });

            const countriesResult = await this.countriesService.findAll({});
            const categoriesResult = await this.categoriesService.findAll({});
            const messages = req.flash();

            // Manually render and return
            return res.render("dashboard/blogs/index", {
                title: "Blogs",
                blogs,
                countries: countriesResult.data || [],
                categories: categoriesResult.data || [],
                user: req.user,
                query: safeQuery, 
                currentPage,
                totalPages,
                layout: "layouts/dashboard",
                messages: {
                    success_msg: messages.success_msg || [],
                    error_msg: messages.error_msg || [],
                    error: messages.error || [],
                },
                blogStatuses: Object.values(BlogStatus),
            });
        } catch (error) {
            console.error("Dashboard Error:", error);
            // If it fails, redirecting is safer than rendering a broken page
            req.flash('error_msg', 'An error occurred loading blogs.');
            return res.redirect("/dashboard");
        }
    }

    @Get("dashboard/add")
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.AGENT)
    @Render("dashboard/blogs/add")
    async getAddBlogPage(@Req() req) {
        const countries = await this.countriesService.findAll({});
        const categories = await this.categoriesService.findAll({});
        const countriesResult = await this.countriesService.findAll({});
        const categoriesResult = await this.categoriesService.findAll({});
        const messages = req.flash();

        return {
            title: "Add Blog - Dashboard",
            countries: countriesResult.data || [],
            categories: categoriesResult.data || [],
            user: req.user,
            layout: "layouts/dashboard",
            messages: {
                success_msg: messages.success_msg,
                error_msg: messages.error_msg,
                error: messages.error,
            },
            oldInput: messages.oldInput ? messages.oldInput[0] : {},
            blogStatuses: Object.values(BlogStatus),
        };
    }

    @Post("dashboard/add")
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.AGENT)
    @UseInterceptors(FileInterceptor("coverImage", getMulterConfig('blogs')))
    async addBlog(
        @Body() createBlogDto: CreateBlogDto,
        @UploadedFile() file: Express.Multer.File,
        @Req() req,
        @Res() res: Response
    ) {
        try {
            // 1. Handle Cover Image Upload
            if (file) {
                createBlogDto.coverImage = `/uploads/blogs/${file.filename}`;
            } else {
                req.flash("error_msg", "Please upload a cover image.");
                req.flash('oldInput', createBlogDto);
                return res.redirect("/blogs/dashboard/add");
            }

            // 2. Normalize Tags (Convert comma-separated string to Array)
            if (typeof createBlogDto.tags === "string") {
                createBlogDto.tags = (createBlogDto.tags as string)
                    .split(",")
                    .map(t => t.trim())
                    .filter(t => t.length > 0);
            }

            // 3. Normalize Countries (Ensure it's an array for Mongoose)
            if (createBlogDto.countries) {
                createBlogDto.countries = Array.isArray(createBlogDto.countries) 
                    ? createBlogDto.countries 
                    : [createBlogDto.countries].filter(Boolean);
            } else {
                createBlogDto.countries = [];
            }

            // 4. Normalize Categories (Ensure it's an array for Mongoose)
            if (createBlogDto.categories) {
                createBlogDto.categories = Array.isArray(createBlogDto.categories) 
                    ? createBlogDto.categories 
                    : [createBlogDto.categories].filter(Boolean);
            } else {
                createBlogDto.categories = [];
            }

            // 5. Create the blog via Service
            // We pass req.user.id as the author
            await this.blogsService.create(createBlogDto, req.user.id);
            
            req.flash("success_msg", "Blog added successfully");
            return res.redirect("/blogs/dashboard/blogs");

        } catch (error) {
            console.error("CREATE BLOG ERROR:", error);
            req.flash("error_msg", error.message || "An error occurred while creating the blog.");
            req.flash('oldInput', createBlogDto);
            return res.redirect("/blogs/dashboard/add");
        }
    }

    // Controller Changes

    @Get("dashboard/edit/:id")
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.AGENT)
    @Render("dashboard/blogs/edit")
    async getEditBlogPage(@Param("id") id: string, @Req() req, @Res() res: Response) {
        try {
            const blog = await this.blogsService.findOne(id);
            if (!blog) throw new NotFoundException(`Blog not found.`);

            // Security check for Agents
            if (req.user.role === UserRole.AGENT && blog.author.toString() !== req.user.id) {
                req.flash("error_msg", "Unauthorized access to this blog.");
                return res.redirect("/blogs/dashboard/blogs");
            }

            // We fetch these so the "Search" and "Dropdowns" in the builder work
            const countriesResult = await this.countriesService.findAll({});
            const categoriesResult = await this.categoriesService.findAll({});
            
            return {
                title: "Edit Blog",
                blog, // This now contains the 'sections' array
                countries: countriesResult.data || [],
                categories: categoriesResult.data || [],
                user: req.user,
                layout: "layouts/dashboard",
                messages: req.flash(),
                blogStatuses: Object.values(BlogStatus),
            };
        } catch (error) {
            req.flash("error_msg", "Could not load blog for editing.");
            return res.redirect("/blogs/dashboard/blogs");
        }
    }

    // Ensure the form uses POST with a Method Override or just POST to this route
    @Post("dashboard/edit/:id") // Using Post because HTML forms don't support PATCH natively
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.AGENT)
    @UseInterceptors(FileInterceptor("coverImage", getMulterConfig('blogs')))
    async updateBlog(
        @Param("id") id: string,
        @Body() updateBlogDto: UpdateBlogDto,
        @UploadedFile() file: Express.Multer.File,
        @Req() req,
        @Res() res: Response,
    ) {
        try {
            if (file) {
                updateBlogDto.coverImage = `/uploads/blogs/${file.filename}`;
                // Optional: delete old image logic here via localStorageService
            }

            await this.blogsService.update(id, updateBlogDto, req.user.id);
            req.flash("success_msg", "Blog updated successfully");
            return res.redirect("/blogs/dashboard/blogs");
        } catch (error) {
            req.flash("error_msg", error.message);
            return res.redirect(`/blogs/dashboard/edit/${id}`);
        }
    }

    @Delete("dashboard/blogs/:id")
    @UseGuards(SessionAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN, UserRole.AGENT)
    async deleteBlog(@Param("id") id: string, @Req() req, @Res() res: Response) {
        try {
            const blog = await this.blogsService.findOne(id);
            if (blog.coverImage) await this.localStorageService.deleteFile(blog.coverImage);
            await this.blogsService.remove(id);
            req.flash("success_msg", "Blog deleted successfully");
        } catch (error) {
            req.flash("error_msg", "Error deleting blog");
        }
        return res.redirect("/blogs/dashboard/blogs");
    }

    // ===============================================
    // PUBLIC-FACING SINGLE BLOG POST ROUTE
    // ===============================================
    // ===============================================
    // BLOG HOME PAGE (Carousels)
    // ===============================================
    @Get()
    @Render("public/pages/blogs/index")
    async getBlogsIndex() {
        const countryData = await this.countriesService.findAll();
        const categoryData = await this.categoriesService.findAll();
        const trendingBlogs = await this.blogsService.findPopular(6);
        const itineraries = await this.toursService.findPopular(6);

        return {
            title: "Travel Blog - Feel Africa Safaris",
            countries: Array.isArray(countryData) ? countryData : countryData.data,
            categories: Array.isArray(categoryData) ? categoryData : categoryData.data,
            trendingBlogs,
            itineraries,
            layout: "layouts/public"
        };
    }

    // ===============================================
    // SPECIFIC COUNTRY PAGE
    // ===============================================
    @Get('country/:id')
    async getCountryBlogs(
        @Param('id') countryId: string, 
        @Query('search') search: string,
        @Query('category') categoryId: string,
        @Res() res: Response 
    ) {
        try {
            const selectedCountry = await this.countriesService.findOne(countryId);
            if (!selectedCountry) return res.redirect('/blogs');

            const categoryData = await this.categoriesService.findAll();
            const categories = Array.isArray(categoryData) ? categoryData : categoryData.data;

            const filter: any = { 
                // CHANGE THIS: from 'country' to 'countries'
                countries: countryId, 
                status: BlogStatus.VISIBLE 
            };

            // Also ensure your search logic doesn't overwrite the filter incorrectly
            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { excerpt: { $regex: search, $options: 'i' } }
                ];
            }

            if (categoryId && categoryId !== 'all') {
                filter.categories = categoryId; // Usually categories is also plural in schemas
            }

            const blogsResult = await this.blogsService.findAll(filter);
            const attractions = await this.destinationsService.findByCountry(countryId, 5);

            return res.render("public/pages/blogs/country", {
                title: `${selectedCountry.name} - Travel Blogs`,
                selectedCountry,
                blogs: blogsResult.blogs || [],
                categories: categories || [],
                attractions: attractions || [],
                searchQuery: search || '',
                selectedCategory: categoryId || 'all',
                layout: "layouts/public"
            });
        } catch (error) {
            return res.redirect('/blogs');
        }
    }

    // ===============================================
    // SPECIFIC CATEGORY PAGE
    // ===============================================
    @Get('category/:id')
    async getCategoryBlogs(
        @Param('id') categoryId: string, 
        @Query('search') search: string,
        @Query('country') countryId: string,
        @Res() res: Response 
    ) {
        try {
            const selectedCategory = await this.categoriesService.findOne(categoryId);
            if (!selectedCategory) return res.redirect('/blogs');

            const countryData = await this.countriesService.findAll();
            const countries = Array.isArray(countryData) ? countryData : countryData.data;

            const filter: any = { 
                categories: categoryId, // Filter by this specific interest
                status: BlogStatus.VISIBLE 
            };

            if (search) {
                filter.$or = [
                    { title: { $regex: search, $options: 'i' } },
                    { excerpt: { $regex: search, $options: 'i' } }
                ];
            }

            const blogsResult = await this.blogsService.findAll(filter);
            
        // 2. Fetch destinations that have this category ID in their 'categories' array
            // We pass the ID directly; Mongoose knows to look into the array
            const attractionsResult = await this.destinationsService.findAll({ 
                categories: categoryId 
            });

            // 3. Extract the array (Handling the common { data: [], total: x } response pattern)
            const attractions = Array.isArray(attractionsResult) 
                ? attractionsResult 
                : (attractionsResult.data || []);

            return res.render("public/pages/blogs/category", {
                title: `${selectedCategory.name} - Explore by Interest`,
                selectedCategory,
                blogs: blogsResult.blogs || [],
                countries: countries || [], // Passing countries for the dropdown filter
                attractions: attractions.slice(0, 5),
                searchQuery: search || '',
                selectedCountry: countryId || 'all',
                layout: "layouts/public"
            });
        } catch (error) {
            console.error("Category Route Error:", error);
            return res.redirect('/blogs');
        }
    }

    // ===============================================
    // SINGLE BLOG PAGE
    // ===============================================
    @Get(":slug")
    @Render("public/pages/blogs/blog")
    async getPublicSingleBlog(@Param("slug") slug: string, @Res() res: Response) {
        try {
            // Call the service method we just created
            const details = await this.blogsService.getBlogDetailsForPublic(slug);
            
            if (!details) {
                return res.redirect('/blogs');
            }

            const { blog, prevBlog, nextBlog, relatedBlogs } = details;

            // Analytics (non-blocking)
            this.blogsService.incrementViews(slug);

            // Sidebar data
            const popularTours = await this.toursService.findPopular(10);
            const categories = await this.categoriesService.findAll();

            return {
                layout: "layouts/public",
                blog,
                prevBlog,
                nextBlog,
                relatedBlogs,
                popularTours,
                categories,
                title: blog.seoTitle || `${blog.title} - Feel Africa Safaris`,
                seo: {
                    title: blog.seoTitle || blog.title,
                    description: blog.seoDescription || blog.excerpt,
                    keywords: blog.seoKeywords || "",
                    ogImage: blog.seoOgImage || blog.coverImage,
                    canonical: `https://feelafricasafaris.com/blogs/${blog.slug}`,
                }
            };
        } catch (error) {
            console.error("Blog Route Error:", error);
            return res.redirect('/blogs');
        }
    }


    // --- SEARCH API ENDPOINTS ---

    @Get('api/search-tours')
    async searchTours(@Query('q') query: string) {
        try {
            const tours = await this.toursService.searchForBlogs(query || '');
            
            const mappedData = tours.map(t => ({ 
                id: t._id, 
                text: t.title 
            }));
            return mappedData;
        } catch (error) {
            return [];
        }
    }

    @Get('api/search-blogs')
    async searchBlogs(@Query('q') query: string) {
        const blogs = await this.blogsService.searchForBlogs(query || '');
        return blogs.map(b => ({ id: b._id, text: b.title }));
    }

    @Get('api/search-countries')
    async searchCountries(@Query('q') query: string) {
        const results = await this.countriesService.searchForBlogs(query || '');
        return results.map(c => ({ id: c._id, text: c.name }));
    }

    @Get('api/search-categories')
    async searchCategories(@Query('q') query: string) {
        const results = await this.categoriesService.searchForBlogs(query || '');
        return results.map(c => ({ id: c._id, text: c.name }));
    }

    @Get('api/search-destinations')
    async searchDestinations(@Query('q') query: string) {
        const results = await this.destinationsService.searchForBlogs(query || '');
        return results.map(d => ({ id: d._id, text: d.name }));
    }

    @Get('api/search-pages')
    async searchPages(@Query('q') query: string) {
        const pages = await this.pagesService.searchForBlogs(query || '');
        return pages.map(p => ({ id: p._id, text: p.title }));
    }
}