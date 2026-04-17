// src/modules/pages/pages.controller.ts
import {
  Controller, Get, Post, Body, Param, UseGuards, Req, Res, Render,
  Query, UseInterceptors, UploadedFiles, HttpException, Patch, Delete,
  NotFoundException, BadRequestException,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { PagesService } from "./pages.service";
import { CreatePageDto } from "./dto/create-page.dto";
import { UpdatePageDto } from "./dto/update-page.dto";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/schemas/user.schema";
import { PageStatus, PageType } from "./schemas/page.schema";
import { LocalStorageService } from "../google-cloud/local-storage.service";

// Multer configuration for local storage
const multerOptions = {
  storage: diskStorage({
    destination: './public/uploads/pages',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
};

@Controller("pages")
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly localStorageService: LocalStorageService
  ) {}

  @Get("dashboard")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/pages/index")
  async getPages(@Query() query: any, @Req() req) {
    const { pages, totalPages, currentPage } = await this.pagesService.findAll(query);
    return {
      title: "Pages - Dashboard",
      pages,
      user: req.user,
      query: { search: query.search || "", status: query.status || "", page: currentPage, limit: query.limit || 10 },
      totalPages,
      currentPage,
      layout: "layouts/dashboard",
      messages: req.flash(),
      pageStatuses: Object.values(PageStatus),
    };
  }

  @Get("dashboard/add")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/pages/add")
  getAddPagePage(@Req() req) {
    const messages = req.flash();
    return {
      title: "Add Page - Dashboard",
      user: req.user,
      layout: "layouts/dashboard",
      messages: {
        success_msg: messages.success_msg,
        error_msg: messages.error_msg,
        error: messages.error,
      },
      oldInput: messages.oldInput ? messages.oldInput[0] : {},
      pageTypes: Object.values(PageType),
      pageStatuses: Object.values(PageStatus),
    };
  }

  @Post("dashboard/add")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'coverImage', maxCount: 1 },
      { name: 'galleryImages', maxCount: 10 },
    ], multerOptions)
  )
  async addPage(
    @Body() createPageDto: CreatePageDto,
    @UploadedFiles() uploadedFiles: { coverImage?: Express.Multer.File[], galleryImages?: Express.Multer.File[] },
    @Req() req,
    @Res() res: Response
  ) {
    try {
      // 1. Parse JSON Content Blocks from script
      if (typeof createPageDto.contentBlocks === 'string') {
        createPageDto.contentBlocks = JSON.parse(createPageDto.contentBlocks);
      }

      // 2. Handle Cover Image
      if (uploadedFiles.coverImage?.[0]) {
        createPageDto.coverImage = `/uploads/pages/${uploadedFiles.coverImage[0].filename}`;
      }

      // 3. Handle Gallery Images
      if (uploadedFiles.galleryImages?.length > 0) {
        createPageDto.galleryImages = uploadedFiles.galleryImages.map(f => `/uploads/pages/${f.filename}`);
      } else {
        createPageDto.galleryImages = [];
      }

      await this.pagesService.create(createPageDto, req.user.id);
      req.flash("success_msg", "Page added successfully");
      return res.redirect("/pages/dashboard");
    } catch (error) {
      console.error("Add Page Error:", error);
      req.flash("error_msg", error.message || "Failed to add page.");
      return res.redirect("/pages/dashboard/add");
    }
  }

  // --- Edit Page Form ---
  @Get("dashboard/edit/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/pages/edit")
  async getEditPagePage(@Param("id") id: string, @Req() req, @Res({ passthrough: true }) res: Response) {
    try {
      const page = await this.pagesService.findOne(id);
      if (!page) {
        throw new NotFoundException(`Page with ID ${id} not found.`);
      }
      const messages = req.flash();

      return {
        title: "Edit Page - Dashboard",
        page,
        user: req.user,
        layout: "layouts/dashboard",
        messages: {
          success_msg: messages.success_msg,
          error_msg: messages.error_msg,
          error: messages.error,
        },
        oldInput: messages.oldInput ? messages.oldInput[0] : {},
        pageTypes: Object.values(PageType),
        pageStatuses: Object.values(PageStatus),
      };
    } catch (error) {
      console.error("Error fetching page for edit:", error);
      req.flash("error_msg", error.message || "Failed to load page for editing.");
      return res.redirect("/pages/dashboard");
    }
  }

  // src/modules/pages/pages.controller.ts

@Patch("dashboard/edit/:id")
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'coverImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 10 },
  ], multerOptions)
)
// src/modules/pages/pages.controller.ts

async updatePage(
  @Param("id") id: string,
  @Body() updatePageDto: UpdatePageDto,
  @UploadedFiles() uploadedFiles: { coverImage?: Express.Multer.File[], galleryImages?: Express.Multer.File[] },
  @Req() req,
  @Res() res: Response,
) {
  try {
    const existingPage = await this.pagesService.findOne(id);
    if (!existingPage) throw new NotFoundException("Page not found");

    // 1. Parse JSON Content Blocks
    if (updatePageDto.contentBlocks && typeof updatePageDto.contentBlocks === 'string') {
        updatePageDto.contentBlocks = JSON.parse(updatePageDto.contentBlocks);
    }

    // 2. FIXED: Cover Image Logic
    const newCoverFile = uploadedFiles?.coverImage?.[0];
    if (newCoverFile) {
      // User uploaded a NEW cover image
      if (existingPage.coverImage) {
        await this.localStorageService.deleteFile(existingPage.coverImage);
      }
      updatePageDto.coverImage = `/uploads/pages/${newCoverFile.filename}`;
    } else {
      // No new file uploaded, KEEP the current one (unless it was already null)
      updatePageDto.coverImage = existingPage.coverImage;
    }

    // 3. Gallery Logic
    let currentGallery = existingPage.galleryImages || [];
    const removedStr = (updatePageDto as any).removedGalleryImages || '';
    if (removedStr) {
      const removedPaths = removedStr.split(',').filter(Boolean);
      for (const path of removedPaths) {
        await this.localStorageService.deleteFile(path);
        currentGallery = currentGallery.filter(img => img !== path);
      }
    }

    if (uploadedFiles.galleryImages?.length > 0) {
      const newPaths = uploadedFiles.galleryImages.map(f => `/uploads/pages/${f.filename}`);
      currentGallery = [...currentGallery, ...newPaths];
    }
    updatePageDto.galleryImages = currentGallery;

    // Cleanup
    delete (updatePageDto as any).removedGalleryImages;

    // 4. Update Database
    await this.pagesService.update(id, updatePageDto, req.user.id);
    
    req.flash("success_msg", "Page updated successfully");
    return res.redirect("/pages/dashboard");
  } catch (error) {
    req.flash("error_msg", error.message);
    return res.redirect(`/pages/dashboard/edit/${id}`);
  }
}

  // --- Handle Delete Page Submission (using DELETE for better RESTfulness) ---
  @Delete("dashboard/:id") // Changed to DELETE route
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deletePage(@Param("id") id: string, @Req() req, @Res() res: Response) {
    try {
      const pageToDelete = await this.pagesService.findOne(id);
      if (!pageToDelete) {
          throw new NotFoundException(`Page with ID ${id} not found.`);
      }

      // Delete associated image before deleting the page
      if (pageToDelete.coverImage) {
          await this.localStorageService.deleteFile(pageToDelete.coverImage);
      }
      if (pageToDelete.galleryImages && pageToDelete.galleryImages.length > 0) {
          for (const imageUrl of pageToDelete.galleryImages) {
              await this.localStorageService.deleteFile(imageUrl);
          }
      }

      await this.pagesService.remove(id);

      req.flash("success_msg", "Page deleted successfully");
      // For simple page reload after deletion, redirect is fine.
      return res.redirect("/pages/dashboard");
    } catch (error) {
      console.error("Error deleting page:", error);
      req.flash("error_msg", error.message || "Failed to delete page.");
      return res.redirect("/pages/dashboard");
    }
  }

  // --- Update Page Status ---
  @Patch("dashboard/status/:id/:status") // Changed to PATCH
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updatePageStatus(
    @Param("id") id: string,
    @Param("status") status: PageStatus,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      if (!Object.values(PageStatus).includes(status)) {
        throw new BadRequestException(`Invalid page status: ${status}`);
      }

      await this.pagesService.updateStatus(id, status, req.user.id);

      req.flash("success_msg", `Page status updated to ${status}`);
      return res.redirect("/pages/dashboard");
    } catch (error) {
      console.error("Error updating page status:", error);
      req.flash("error_msg", error.message || "Failed to update page status.");
      return res.redirect("/pages/dashboard");
    }
  }

  // --- Public View Page (Optional, for completeness) ---
  @Get(":slug") // GET /pages/:slug (public single page view)
  @Render("public/pages/show") // Assuming you'll have a public show template for pages
  async getPublicSinglePage(@Param("slug") slug: string, @Req() req, @Res({ passthrough: true }) res: Response) {
      try {
          const page = await this.pagesService.findBySlug(slug);
          if (!page || page.status !== PageStatus.PUBLISHED) { // Ensure only published pages are viewable publicly
              throw new NotFoundException(`Page with slug '${slug}' not found or not published.`);
          }
          return {
              title: page.seoTitle || page.title,
              page,
              layout: "layouts/public",
              seo: {
                  title: page.seoTitle || page.title,
                  description: page.seoDescription || page.description,
                  keywords: page.seoKeywords,
                  canonicalUrl: page.seoCanonicalUrl,
                  ogImage: page.seoOgImage || page.coverImage,
              },
          };
      } catch (error) {
          if (error instanceof NotFoundException) {
              req.flash('error_msg', error.message);
              // Consider a dedicated 404 page render or redirect to a more general page list.
              return res.redirect('/'); // Redirect to homepage or general pages list
          }
          console.error('Error loading public page:', error);
          req.flash('error_msg', 'An unexpected error occurred while loading the page.');
          return res.redirect('/'); // Redirect to homepage or general pages list
      }
  }
}