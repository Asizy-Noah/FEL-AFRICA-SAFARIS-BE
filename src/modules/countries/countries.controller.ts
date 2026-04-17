// src/modules/countries/countries.controller.ts

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Req,
  Res,
  Render,
  Query,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFiles,
} from "@nestjs/common";
import {
  FilesInterceptor,
  FileInterceptor,
  FileFieldsInterceptor,
} from "@nestjs/platform-express"; // Keep for Multer, but no specific disk storage needed now
import { Response } from "express";
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CountriesService } from "./countries.service";
import { CreateCountryDto } from "./dto/create-country.dto";
import { UpdateCountryDto } from "./dto/update-country.dto";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/schemas/user.schema";

import { ToursService } from "../tours/tours.service";
import { CategoriesService } from "../categories/categories.service";
import { DestinationsService } from "../destinations/destinations.service";
import { LocalStorageService } from "../google-cloud/local-storage.service";

@Controller("countries")
export class CountriesController {
  constructor(
    private readonly countriesService: CountriesService,
    private readonly categoriesService: CategoriesService,
    private readonly toursService: ToursService,
    private readonly destinationsService: DestinationsService,
    private readonly localStorageService: LocalStorageService
  ) {}

  @Get()
  @Render("public/countries/index")
  async getAllCountries() {
    const countries = await this.countriesService.findAll();

    return {
      title: "Safari Destinations",
      countries,
      layout: "layouts/public",
    };
  }

  @Get(":slug")
@Render("public/countries/country")
async getCountry(
  @Param("slug") slug: string,
  @Req() req: any,
  @Res({ passthrough: true }) res: Response
) {
  try {
    // 1. Fetch the Country base data
    const countryDoc = await this.countriesService.findBySlug(slug);

    if (!countryDoc) {
        throw new HttpException('Country not found', HttpStatus.NOT_FOUND);
    }

    // 2. Fetch all related data using the country's ID
    const countryId = countryDoc._id.toString();

    // Execute all queries in parallel for better performance
    const [destinations, categories, tours] = await Promise.all([
      this.destinationsService.findByCountryforCountryPage(countryId),
      this.categoriesService.findByCountry(countryId),
      this.toursService.findByCountry(countryId),
    ]);

    // 3. Prepare the data for the EJS template
    // We convert the Mongoose document to a plain object and attach destinations
    const country = {
      ...countryDoc.toObject(),
      destinations: destinations || []
    };

    return {
      title: `${country.name}`,
      country,
      categories,
      tours,
      layout: "layouts/public",
      messages: req.flash(),
      seo: {
        title: country.seoTitle || `${country.name}`,
        description: country.seoDescription || country.overview,
        keywords: country.seoKeywords,
        canonicalUrl: country.seoCanonicalUrl,
        ogImage: country.seoOgImage || country.coverImage,
      },
    };
  } catch (error) {
    console.error(`Error loading country page for slug ${slug}:`, error);
    
    // Handle the error and redirect
    const errorMessage = error instanceof HttpException 
      ? error.message 
      : "An error occurred while loading the country page.";
      
    req.flash("error_msg", errorMessage);
    return res.redirect("/");
  }
}

  @Get("dashboard/countries")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/countries/index")
  async getCountries(
    @Query() query: { search?: string; page?: string; limit?: string },
    @Req() req: any
  ) {
    const page = parseInt(query.page || "1");
    const limit = parseInt(query.limit || "6");
    const search = query.search || "";

    const { data: countries, total, totalPages } =
      await this.countriesService.findAll({
        search,
        page: page.toString(),
        limit: limit.toString(),
      });

    return {
      title: "Countries - Dashboard",
      countries,
      user: req.user,
      query,
      currentPage: page,
      totalPages: totalPages,
      totalCountries: total,
      limit,
      layout: "layouts/dashboard",
      messages: req.flash(),
    };
  }

  @Get("dashboard/countries/add")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/countries/add")
  getAddCountryPage(@Req() req: any) {
    return {
      title: "Add Country - Dashboard",
      user: req.user,
      layout: "layouts/dashboard",
    };
  }

  @Post("dashboard/countries/add")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "coverImage", maxCount: 1 },
      { name: "galleryImages", maxCount: 10 },
    ], {
      storage: diskStorage({
        destination: './public/uploads/countries', // Ensure this folder exists!
        filename: (req, file, cb) => {
          // Generate a unique name: timestamp + random + extension
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    })
  )
  async addCountry(
    @Body() createCountryDto: CreateCountryDto,
    @UploadedFiles()
    uploadedFiles: {
      coverImage?: Express.Multer.File[];
      galleryImages?: Express.Multer.File[];
    },
    @Req() req: any,
    @Res() res: Response
  ) {
    try {
      const newCoverImageFile = uploadedFiles.coverImage
        ? uploadedFiles.coverImage[0]
        : null;
      const newGalleryImageFiles = uploadedFiles.galleryImages || [];

      // Save cover image path
      if (newCoverImageFile) {
        createCountryDto.coverImage = `/uploads/countries/${newCoverImageFile.filename}`;
      } else if (createCountryDto.coverImage === "") {
        createCountryDto.coverImage = null;
      }

      // Save gallery image paths
      if (newGalleryImageFiles.length > 0) {
        const galleryImageUrls: string[] = [];
        for (const file of newGalleryImageFiles) {
          galleryImageUrls.push(`/uploads/countries/${file.filename}`);
        }
        createCountryDto.galleryImages = galleryImageUrls;
      } else if (!createCountryDto.galleryImages) {
        createCountryDto.galleryImages = [];
      }

      await this.countriesService.create(createCountryDto, req.user.id);

      req.flash("success_msg", "Country added successfully");
      return res.redirect("/countries/dashboard/countries");
    } catch (error) {
      console.error("Error adding country:", error);

      let flashMessage = "Failed to add country.";
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
              "A country with this slug already exists. Please choose a different title or slug.";
          else if (error.keyPattern.name)
            flashMessage = "A country with this name already exists.";
          else flashMessage = "A duplicate entry error occurred.";
        } else {
          flashMessage = error.message;
        }
      }

      req.flash("error_msg", flashMessage);
      req.flash("oldInput", createCountryDto);
      return res.redirect("/countries/dashboard/countries/add");
    }
  }

  @Get("dashboard/countries/edit/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Render("dashboard/countries/edit")
  async getEditCountryPage(@Param("id") id: string, @Req() req: any) {
    try {
      const country = await this.countriesService.findOne(id);
      if (!country) {
        req.flash("error_msg", "Country not found.");
        return req.res.redirect("/countries/dashboard/countries");
      }
      return {
        title: `Edit ${country.name} - Dashboard`,
        country,
        user: req.user,
        layout: "layouts/dashboard",
        messages: req.flash(),
      };
    } catch (error) {
      console.error("Error fetching country for edit:", error);
      req.flash("error_msg", "Could not load country for editing.");
      return req.res.redirect("/countries/dashboard/countries");
    }
  }

  @Post("dashboard/countries/edit/:id") // Using POST for form submission, consider PATCH for true REST if using AJAX
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "coverImage", maxCount: 1 },
      { name: "galleryImages", maxCount: 10 },
    ], {
      storage: diskStorage({
        destination: './public/uploads/countries', // Ensure this folder exists!
        filename: (req, file, cb) => {
          // Generate a unique name: timestamp + random + extension
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    })
  )
  async updateCountry(
    @Param("id") id: string,
    @Body() updateCountryDto: UpdateCountryDto,
    @UploadedFiles()
    uploadedFiles: {
      coverImage?: Express.Multer.File[];
      galleryImages?: Express.Multer.File[];
    },
    @Req() req: any,
    @Res() res: Response
  ) {
    try {
      const country = await this.countriesService.findOne(id);
      if (!country) {
        req.flash("error_msg", "Country not found.");
        return res.redirect("/countries/dashboard/countries");
      }

      // --- Handle Cover Image ---
      const newCoverImageFile = uploadedFiles.coverImage
        ? uploadedFiles.coverImage[0]
        : null;

      if (newCoverImageFile) {
        // Save new cover image path
        if (country.coverImage) {
          await this.localStorageService.deleteFile(country.coverImage);
        }
        updateCountryDto.coverImage = `/uploads/countries/${newCoverImageFile.filename}`;
      } else if (updateCountryDto.coverImage === "remove") {
        // If user explicitly removed cover image (client sends "remove" string)
        if (country.coverImage) {
          await this.localStorageService.deleteFile(country.coverImage);
        }
        updateCountryDto.coverImage = null;
      } else {
        // No new file, and not explicitly removed, so retain the existing one
        updateCountryDto.coverImage = country.coverImage;
      }

      // --- Handle Gallery Images ---
      const newGalleryImageFiles = uploadedFiles.galleryImages || [];
      let currentGalleryImages = country.galleryImages || [];

      // 1. Filter out removed gallery images (from hidden input `removedGalleryImages`)
      const removedGalleryImagePaths = updateCountryDto.removedGalleryImages
        ? updateCountryDto.removedGalleryImages
            .split(",")
            .map((img) => img.trim())
            .filter(Boolean)
        : [];

      // Delete removed images
      for (const imageUrl of removedGalleryImagePaths) {
          await this.localStorageService.deleteFile(imageUrl);
      }

      currentGalleryImages = currentGalleryImages.filter(
        (img) => !removedGalleryImagePaths.includes(img)
      );

      // 2. Add newly uploaded gallery images
      if (newGalleryImageFiles.length > 0) {
        const newlyAddedGalleryPaths: string[] = [];
        for (const file of newGalleryImageFiles) {
          const url = `/uploads/countries/${file.filename}`;
          newlyAddedGalleryPaths.push(url);
        }
        currentGalleryImages = [...currentGalleryImages, ...newlyAddedGalleryPaths];
      }
      updateCountryDto.galleryImages = currentGalleryImages;

      // Remove the temporary 'removedGalleryImages' from DTO before saving to DB
      delete (updateCountryDto as any).removedGalleryImages;


      // --- Handle Slug Generation ---
      if (
        updateCountryDto.name &&
        updateCountryDto.name !== country.name &&
        !updateCountryDto.slug
      ) {
        updateCountryDto.slug = this.countriesService.generateSlug(
          updateCountryDto.name
        );
      } else if (updateCountryDto.slug && updateCountryDto.slug !== country.slug) {
          // If slug was manually provided/changed, ensure it's valid
          updateCountryDto.slug = this.countriesService.generateSlug(updateCountryDto.slug); // Sanitize if it's user-provided
      }


      await this.countriesService.update(id, updateCountryDto, req.user._id);

      req.flash("success_msg", "Country updated successfully!");
      return res.redirect("/countries/dashboard/countries");
    } catch (error) {
      console.error("Error updating country:", error);

      let flashMessage = "Failed to update country. Please try again.";
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
              "A country with this slug already exists. Please choose a different title or slug.";
          else if (error.keyPattern.name)
            flashMessage = "A country with this name already exists.";
          else flashMessage = "A duplicate entry error occurred.";
        } else {
          flashMessage = error.message;
        }
      }

      req.flash("error_msg", flashMessage);
      req.flash("oldInput", updateCountryDto);
      return res.redirect(`/countries/dashboard/countries/edit/${id}`);
    }
  }

  // Changed to DELETE for more RESTful design
  @Delete("dashboard/countries/:id")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async deleteCountry(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    try {
      const country = await this.countriesService.findOne(id); // Fetch to get image URLs
      if (!country) {
          req.flash("error_msg", "Country not found.");
          return res.redirect("/countries/dashboard/countries");
      }

      // Delete associated images
      if (country.coverImage) {
          await this.localStorageService.deleteFile(country.coverImage);
      }
      if (country.galleryImages && country.galleryImages.length > 0) {
          for (const imageUrl of country.galleryImages) {
              await this.localStorageService.deleteFile(imageUrl);
          }
      }

      await this.countriesService.remove(id);

      req.flash("success_msg", "Country deleted successfully");
      return res.redirect("/countries/dashboard/countries");
    } catch (error) {
      console.error('Error deleting country:', error); // Add a more detailed log
      req.flash("error_msg", error.message || "Failed to delete country.");
      return res.redirect("/countries/dashboard/countries");
    }
  }

  @Get('api/all')
async getAll() {
    // This calls your service to get all countries, usually sorted by name
    return this.countriesService.findAll(); 
} 
}