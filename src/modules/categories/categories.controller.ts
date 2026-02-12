// src/modules/categories/categories.controller.ts
import {
  Controller,
  Get,
  Render,
  Post,
  Put, // Keep Put if you explicitly use it for updates, though PATCH is often preferred for partial updates
  Body,
  ValidationPipe,
  Req,
  Res,
  UseGuards,
  Param,
  Delete,
  Patch, // Recommended for updates
  Query,
  UseInterceptors,
  UploadedFile,
  HttpException, // Import HttpException
  HttpStatus, // Import HttpStatus
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/schemas/user.schema";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { CountriesService } from "../countries/countries.service";
import { LocalStorageService } from "../google-cloud/local-storage.service";

@Controller("categories") // Base route for dashboard categories
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.AGENT) // Adjust roles as needed
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly countriesService: CountriesService,
    private readonly localStorageService: LocalStorageService
  ) {}

  @Get("dashboard")
  @Render("dashboard/categories/index")
  async getCategories(
    @Req() req,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("search") search: string,
    @Query("countryId") countryId: string = "all"
  ) {
    const currentPage = parseInt(page, 10);
    const perPageLimit = parseInt(limit, 10);

    const findCategoriesOptions: any = {
      page: currentPage.toString(),
      limit: perPageLimit.toString(),
    };
    if (search) findCategoriesOptions.search = search;
    if (countryId && countryId !== "all")
      findCategoriesOptions.countryId = countryId;

    const {
      data: categories,
      total: totalDocs,
      limit: resLimit,
      totalPages,
      page: resPage,
    } = await this.categoriesService.findAll(findCategoriesOptions);

    const hasNextPage = resPage < totalPages;
    const hasPrevPage = resPage > 1;
    const nextPage = hasNextPage ? resPage + 1 : null;
    const prevPage = hasPrevPage ? resPage - 1 : null;

    const allCountriesResult = await this.countriesService.findAll({});
    const countries = allCountriesResult.data;

    return {
      title: "Categories - Dashboard",
      categories,
      countries,
      user: req.user,
      query: {
        page: currentPage.toString(),
        limit: perPageLimit.toString(),
        search,
        countryId,
      },
      pagination: {
        totalDocs,
        limit: resLimit,
        totalPages,
        page: resPage,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage,
      },
      messages: req.flash(),
      layout: "layouts/dashboard",
    };
  }

  @Get("dashboard/add")
  @Render("dashboard/categories/add")
  async getAddCategoryPage(@Req() req) {
    const allCountriesResult = await this.countriesService.findAll({});
    const countries = allCountriesResult.data;
    const body = {}; // Used for re-populating form on error
    return {
      title: "Add Category - Dashboard",
      layout: "layouts/dashboard",
      countries,
      user: req.user,
      messages: req.flash(),
      oldInput: body, // Use oldInput to re-populate on validation errors
    };
  }

  @Post("dashboard/add")
  @UseInterceptors(
    FileInterceptor("image") // 'image' is the name attribute of your file input
  )
  async addCategory(
    @Body(ValidationPipe) createCategoryDto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!req.user || !req.user.id) {
      req.flash("error_msg", "You must be logged in to add a category.");
      return res.redirect("/auth/login");
    }

    try {
      // Upload image to local storage if a file is provided
      if (file) {
        // Save image path
        createCategoryDto.image = `/uploads/categories/${file.filename}`;
      } else {
        // If image is optional and not provided, ensure it's not set to an empty string
        createCategoryDto.image = null; // Or undefined, based on your schema
      }

      const userId = req.user.id.toString();
      await this.categoriesService.create(createCategoryDto, userId);

      req.flash("success_msg", "Category added successfully!");
      return res.redirect("/categories/dashboard");
    } catch (error) {
      console.error("Error adding category:", error);

      let flashMessage = "Failed to add category.";
      if (error instanceof HttpException) {
        const response = error.getResponse();
        if (
          typeof response === "object" &&
          response !== null &&
          "message" in response
        ) {
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
              "A category with this slug already exists. Please choose a different name or slug.";
          else if (error.keyPattern.name)
            flashMessage = "A category with this name already exists.";
          else flashMessage = "A duplicate entry error occurred.";
        } else {
          flashMessage = error.message;
        }
      }

      req.flash("error_msg", flashMessage);
      req.flash("oldInput", createCategoryDto); // Preserve old input

      const allCountriesResult = await this.countriesService.findAll({});
      const countries = allCountriesResult.data;

      return res.render("dashboard/categories/add", {
        title: "Add Category - Dashboard",
        countries,
        user: req.user,
        layout: "layouts/dashboard",
        messages: req.flash(),
        oldInput: createCategoryDto,
      });
    }
  }

  @Get("dashboard/edit/:id")
  @Render("dashboard/categories/edit")
  async getEditCategoryPage(
    @Param("id") id: string,
    @Req() req,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const category = await this.categoriesService.findOne(id);
      if (!category) {
        req.flash("error_msg", "Category not found.");
        return res.redirect("/categories/dashboard"); // Corrected redirect path
      }
      const allCountriesResult = await this.countriesService.findAll({});
      const countries = allCountriesResult.data;

      const user = req.user as any;
      if (
        user.role === UserRole.AGENT &&
        category.createdBy.toString() !== user._id.toString()
      ) {
        req.flash("error_msg", "You are not authorized to edit this category.");
        return res.redirect("/categories/dashboard"); // Corrected redirect path
      }

      return {
        title: "Edit Category - Dashboard",
        category,
        countries,
        user: req.user,
        layout: "layouts/dashboard",
        messages: req.flash(),
      };
    } catch (error) {
      console.error("Error fetching category for edit:", error);
      req.flash("error_msg", error.message || "Category not found or an error occurred.");
      return res.redirect("/categories/dashboard"); // Corrected redirect path
    }
  }

  // Changed to PATCH for RESTful design (for partial updates)
  @Patch("dashboard/edit/:id")
  @UseInterceptors(

    FileInterceptor("image")
  )
  async updateCategory(
    @Param("id") id: string,
    @Body(ValidationPipe) updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!req.user || !req.user.id) {
      req.flash("error_msg", "You must be logged in to update a category.");
      return res.redirect("/auth/login");
    }

    try {
      const existingCategory = await this.categoriesService.findOne(id);
      if (!existingCategory) {
        throw new HttpException("Category not found", HttpStatus.NOT_FOUND);
      }

      const user = req.user as any;
      if (
        user.role === UserRole.AGENT &&
        existingCategory.createdBy.toString() !== user._id.toString()
      ) {
        req.flash("error_msg", "You are not authorized to update this category.");
        return res.redirect("/categories/dashboard");
      }

      // Handle image update
      if (file) {
        // Upload new image to GCS
        const newImageUrl = `/uploads/categories/${file.filename}`;
        // If there was an old image, delete it
        if (existingCategory.image) {
          await this.localStorageService.deleteFile(existingCategory.image);
        }
        updateCategoryDto.image = newImageUrl;
      } else if (updateCategoryDto.image === "") {
        // If the client sent an empty string, it means the user wants to remove the image
        if (existingCategory.image) {
          await this.localStorageService.deleteFile(existingCategory.image);
        }
        updateCategoryDto.image = null; // Set to null to clear it in DB
      } else {
        // If no new file and not explicitly cleared, retain the existing image URL
        updateCategoryDto.image = existingCategory.image;
      }

      const userId = req.user.id.toString();
      await this.categoriesService.update(id, updateCategoryDto, userId);

      req.flash("success_msg", "Category updated successfully!");
      return res.redirect("/categories/dashboard");
    } catch (error) {
      console.error("Error updating category:", error);

      let flashMessage = "Failed to update category.";
      if (error instanceof HttpException) {
        const response = error.getResponse();
        if (
          typeof response === "object" &&
          response !== null &&
          "message" in response
        ) {
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
              "A category with this slug already exists. Please choose a different name or slug.";
          else if (error.keyPattern.name)
            flashMessage = "A category with this name already exists.";
          else flashMessage = "A duplicate entry error occurred.";
        } else {
          flashMessage = error.message;
        }
      }

      req.flash("error_msg", flashMessage);
      req.flash("oldInput", updateCategoryDto);

      const allCountriesResult = await this.countriesService.findAll({});
      const countries = allCountriesResult.data;

      // When rendering on error, fetch the original category again to show current state,
      // but also pass `oldInput` to pre-fill the form fields with what the user tried to submit.
      const categoryToRender = await this.categoriesService.findOne(id).catch(() => null);

      return res.render("dashboard/categories/edit", {
        title: "Edit Category - Dashboard",
        category: categoryToRender || { _id: id, ...updateCategoryDto }, // Fallback if findOne fails
        countries,
        user: req.user,
        layout: "layouts/dashboard",
        messages: req.flash(),
        oldInput: updateCategoryDto,
      });
    }
  }

  @Delete("dashboard/delete/:id") // Keep this as DELETE if your frontend sends _method=DELETE
  async deleteCategory(
    @Param("id") id: string,
    @Req() req,
    @Res() res: Response // Ensure @Res() is not { passthrough: true } for explicit redirects
  ) {
    try {
      const user = req.user as any;
      const existingCategory = await this.categoriesService.findOne(id);

      if (!existingCategory) {
        req.flash("error_msg", "Category not found."); // Flash message for not found
        return res.redirect("/categories/dashboard"); // Redirect on not found
      }

      // Authorization check
      if (
        user.role === UserRole.AGENT &&
        existingCategory.createdBy.toString() !== user._id.toString()
      ) {
        req.flash("error_msg", "You are not authorized to delete this category.");
        return res.redirect("/categories/dashboard"); // Redirect on unauthorized
      }

      // Delete associated image before deleting the category document
      if (existingCategory.image) {
        await this.localStorageService.deleteFile(existingCategory.image);
      }

      await this.categoriesService.remove(id);

      req.flash("success_msg", "Category deleted successfully!");
      return res.redirect("/categories/dashboard"); // <--- THIS IS THE KEY CHANGE FOR SUCCESS
    } catch (error) {
      console.error("Error deleting category:", error);
      let errorMessage = error.message || "Failed to delete category.";

      if (error instanceof HttpException) {
        const response = error.getResponse();
        errorMessage = typeof response === 'object' && response !== null && 'message' in response
            ? (Array.isArray(response.message) ? response.message.join(', ') : (response.message as string))
            : (typeof response === 'string' ? response : error.message || errorMessage);
      } else if (error.code === 11000) { // MongoDB duplicate key error example
          errorMessage = "A duplicate entry error occurred.";
      }

      req.flash("error_msg", errorMessage);
      return res.redirect("/categories/dashboard"); // <--- REDIRECT ON ERROR AS WELL
    }
  }
}