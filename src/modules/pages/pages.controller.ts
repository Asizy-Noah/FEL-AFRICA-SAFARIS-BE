// src/modules/pages/pages.controller.ts

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
  Query,
  UseInterceptors,
  UploadedFiles, // Remains UploadedFiles for FileFieldsInterceptor //
  HttpException,
  HttpStatus,
  Patch,
  Delete,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { FileFieldsInterceptor, AnyFilesInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { PagesService } from "./pages.service";
import type { CreatePageDto } from "./dto/create-page.dto";
import type { UpdatePageDto } from "./dto/update-page.dto";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/schemas/user.schema";
import { PageStatus, PageType } from "./schemas/page.schema";

import { LocalStorageService } from "../google-cloud/local-storage.service";

@Controller("pages")
export class PagesController {
  constructor(
    private readonly pagesService: PagesService,
    private readonly localStorageService: LocalStorageService
  ) {}

  // --- Dashboard Pages List ---
  @Get("dashboard")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/pages/index")
  async getPages(@Query() query: any, @Req() req) {
    try {
      const { pages, totalPages, currentPage } = await this.pagesService.findAll(query);
      const messages = req.flash();

      return {
        title: "Pages - Dashboard",
        pages,
        user: req.user,
        query: {
          search: query.search || "",
          status: query.status || "",
          page: currentPage,
          limit: query.limit || 10,
        },
        totalPages,
        currentPage,
        layout: "layouts/dashboard",
        messages: {
          success_msg: messages.success_msg,
          error_msg: messages.error_msg,
          error: messages.error,
        },
        pageStatuses: Object.values(PageStatus),
      };
    } catch (error) {
      console.error("Error fetching dashboard pages:", error);
      req.flash("error_msg", "Failed to load pages: " + error.message);
      return {
        title: "Pages - Dashboard",
        pages: [],
        user: req.user,
        query: { search: "", status: "", page: 1, limit: 10 },
        totalPages: 0,
        currentPage: 1,
        layout: "layouts/dashboard",
        messages: req.flash(),
        pageStatuses: Object.values(PageStatus),
      };
    }
  }

  // --- Add Page Form ---
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
    // Use FileFieldsInterceptor to explicitly map field names to uploaded files
    FileFieldsInterceptor([
      { name: 'coverImage', maxCount: 1 },
      { name: 'galleryImages', maxCount: 10 }, // Max 10 gallery images
      // If you have images uploaded via a rich text editor (e.g., TinyMCE's image upload),
      // they might have a different field name or need a separate interceptor.
      // For now, assume these are the only direct file uploads.
    ])
  )
  async addPage(
    @Body() createPageDto: CreatePageDto,
    @UploadedFiles() uploadedFiles: { coverImage?: Express.Multer.File[], galleryImages?: Express.Multer.File[] },
    @Req() req,
    @Res() res: Response
  ) {
    try {
      // Process cover image
      const coverImageFile = uploadedFiles.coverImage ? uploadedFiles.coverImage[0] : null;
      if (coverImageFile) {
        createPageDto.coverImage = `/uploads/pages/${coverImageFile.filename}`;
      } else if (createPageDto.coverImage === '') {
        createPageDto.coverImage = null; // Clear if client explicitly sends empty string
      }

      // Process gallery images
      const galleryImageFiles = uploadedFiles.galleryImages || [];
      if (galleryImageFiles.length > 0) {
        const galleryImageUrls: string[] = [];
        for (const file of galleryImageFiles) {
          const url = `/uploads/pages/${file.filename}`;
          
          galleryImageUrls.push(url);
        }
        createPageDto.galleryImages = galleryImageUrls;
      } else if (!createPageDto.galleryImages) {
        createPageDto.galleryImages = []; // Ensure it's an empty array if no new files and no existing
      }

      // Handle slug generation
      if (!createPageDto.slug && createPageDto.title) { 
        createPageDto.slug = createPageDto.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
      }

      await this.pagesService.create(createPageDto, req.user.id);

      req.flash("success_msg", "Page added successfully");
      return res.redirect("/pages/dashboard");
    } catch (error) {
      console.error("Error adding page:", error);
      let flashMessage = "Failed to add page.";
      // ... (rest of error handling remains the same) ...
      if (error instanceof HttpException) {
        const response = error.getResponse();
        if (typeof response === "object" && response !== null && "message" in response) {
          if (Array.isArray(response.message)) {
            flashMessage = response.message.join(", ");
          } else {
            flashMessage = response.message as string;
          }
        } else if (typeof response === "string") {
          flashMessage = response;
        } else {
          flashMessage = error.message || "An unknown error occurred.";
        }
      } else if (error.message) {
        if (error.code === 11000 && error.keyPattern && error.keyValue) {
          if (error.keyPattern.slug)
            flashMessage =
              "A page with this slug already exists. Please choose a different title or slug.";
          else if (error.keyPattern.title)
            flashMessage = "A page with this title already exists.";
          else flashMessage = "A duplicate entry error occurred.";
        } else {
          flashMessage = error.message;
        }
      }

      req.flash("error_msg", flashMessage);
      req.flash("oldInput", createPageDto);
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

  // --- Handle Update Page Submission (using PATCH for clarity) ---
  @Patch("dashboard/edit/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'coverImage', maxCount: 1 },
      { name: 'galleryImages', maxCount: 10 },
    ])
  )
  async updatePage(
    @Param("id") id: string,
    @Body() updatePageDto: UpdatePageDto,
    @UploadedFiles() uploadedFiles: { coverImage?: Express.Multer.File[], galleryImages?: Express.Multer.File[] },
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      const existingPage = await this.pagesService.findOne(id);
      if (!existingPage) {
        throw new NotFoundException(`Page with ID ${id} not found.`);
      }

      // Handle Cover Image
      const newCoverImageFile = uploadedFiles.coverImage ? uploadedFiles.coverImage[0] : null;
      if (newCoverImageFile) {
        const newImageUrl = `/uploads/pages/${newCoverImageFile.filename}`;
        // If there was an old image, delete it
        if (existingPage.coverImage) {
          await this.localStorageService.deleteFile(existingPage.coverImage);
        }
        updatePageDto.coverImage = newImageUrl;
          // If the client sent an empty string, it means the user wants to remove the image
          if (existingPage.coverImage) {
              await this.localStorageService.deleteFile(existingPage.coverImage);
          }
          updatePageDto.coverImage = null;
      } else {
          // If no new file and not explicitly removed, retain the existing one
          updatePageDto.coverImage = existingPage.coverImage;
      }

      // Handle Gallery Images
      const newGalleryImageFiles = uploadedFiles.galleryImages || [];
      let currentGalleryImages = existingPage.galleryImages || [];

      // Filter out removed gallery images (assuming client sends `removedGalleryImages` as a comma-separated string)
      const removedGalleryImagePaths = (updatePageDto as any).removedGalleryImages
        ? (updatePageDto as any).removedGalleryImages.split(',').map((img: string) => img.trim()).filter(Boolean)
        : [];

      // Delete removed images
      for (const imageUrl of removedGalleryImagePaths) {
          await this.localStorageService.deleteFile(imageUrl);
      }
      currentGalleryImages = currentGalleryImages.filter(img => !removedGalleryImagePaths.includes(img));

      // Add newly uploaded gallery images
      if (newGalleryImageFiles.length > 0) {
        const newlyAddedGalleryPaths: string[] = [];
        for (const file of newGalleryImageFiles) {
          const url = `/uploads/pages/${file.filename}`;
          newlyAddedGalleryPaths.push(url);
        }
        currentGalleryImages = [...currentGalleryImages, ...newlyAddedGalleryPaths];
      }
      updatePageDto.galleryImages = currentGalleryImages;

      // Remove the temporary 'removedGalleryImages' from DTO before saving to DB
      delete (updatePageDto as any).removedGalleryImages;


      // Handle slug generation
      if (updatePageDto.title && updatePageDto.title !== existingPage.title && !updatePageDto.slug) {
          updatePageDto.slug = updatePageDto.title
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-');
      } else if (updatePageDto.slug && updatePageDto.slug !== existingPage.slug) {
          // If slug was manually provided/changed, you might want to sanitize it
          updatePageDto.slug = updatePageDto.slug
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-');
      }


      await this.pagesService.update(id, updatePageDto, req.user.id);

      req.flash("success_msg", "Page updated successfully");
      return res.redirect("/pages/dashboard");
    } catch (error) {
      console.error("Error updating page:", error);
      let flashMessage = "Failed to update page.";
      // ... (rest of error handling remains the same) ...
      if (error instanceof HttpException) {
        const response = error.getResponse();
        if (typeof response === "object" && response !== null && "message" in response) {
          if (Array.isArray(response.message)) {
            flashMessage = response.message.join(", ");
          } else {
            flashMessage = response.message as string;
          }
        } else if (typeof response === "string") {
          flashMessage = response;
        } else {
          flashMessage = error.message || "An unknown error occurred.";
        }
      } else if (error.message) {
        if (error.code === 11000 && error.keyPattern && error.keyValue) {
          if (error.keyPattern.slug)
            flashMessage =
              "A page with this slug already exists. Please choose a different title or slug.";
          else flashMessage = "A duplicate entry error occurred.";
        } else {
          flashMessage = error.message;
        }
      }

      req.flash("error_msg", flashMessage);
      req.flash("oldInput", updatePageDto);
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