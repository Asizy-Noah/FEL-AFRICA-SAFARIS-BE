// src/modules/tours/tours.controller.ts

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
  UploadedFile,
  HttpException,
  HttpStatus,
  UploadedFiles,
  Patch,
  Delete,
} from "@nestjs/common";
import {
  FilesInterceptor,
  FileFieldsInterceptor,
  FileInterceptor,
  AnyFilesInterceptor,
} from "@nestjs/platform-express"; // Keep these for local storage if still needed, but we'll remove multer-specific storage options later
import { Response } from "express";
import { ToursService } from "./tours.service";
import { CreateTourDto } from "./dto/create-tour.dto";
import { UpdateTourDto } from "./dto/update-tour.dto";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/schemas/user.schema";
import { TourStatus } from "./schemas/tour.schema";

import { CountriesService } from "../countries/countries.service";
import { CategoriesService } from "../categories/categories.service";
import { DestinationsService } from "../destinations/destinations.service";
import { LocalStorageService } from "../google-cloud/local-storage.service";

@Controller("tours")
export class ToursController {
  constructor(
    private readonly toursService: ToursService,
    private readonly countriesService: CountriesService,
    private readonly categoriesService: CategoriesService,
    private readonly destinationsService: DestinationsService,
    private readonly localStorageService: LocalStorageService
  ) {}

  @Get()
  @Render("public/tours/index")
  async getAllTours(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("search") search: string = "",
    @Query("countryId") countryId: string = "all",
    @Query("categoryId") categoryId: string = "all",
    @Query("status") status: TourStatus = TourStatus.PUBLISHED
  ) {
    const {
      tours,
      totalDocs,
      limit: perPageLimit,
      totalPages,
      page: currentPage,
      hasNextPage,
      hasPrevPage,
      nextPage,
      prevPage,
    } = await this.toursService.findAll({
      page,
      limit,
      search,
      country: countryId === "all" ? undefined : countryId,
      category: categoryId === "all" ? undefined : categoryId,
      status: status,
    });

    const countries = await this.countriesService.findAll({});
    const categories = await this.categoriesService.findAll({});

    return {
      title: "Safari Tours",
      tours,
      countries: countries.data,
      categories: categories.data,
      query: {
        page: currentPage.toString(),
        limit: perPageLimit.toString(),
        search,
        countryId,
        categoryId,
        status,
      },
      pagination: {
        totalDocs,
        totalPages,
        currentPage,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage,
      },
      layout: "layouts/public",
    };
  }

  @Get(":slug")
  @Render("public/tours/show")
  async getTour(@Param("slug") slug: string) {
    const tour = await this.toursService.findBySlug(slug);

    if (!tour) {
        throw new HttpException('Tour not found', HttpStatus.NOT_FOUND);
    }

    // Get related tours from the same countries
    const relatedToursResult = await this.toursService.findAll({
      country: tour.countries.length > 0 ? tour.countries[0]?._id.toString() : undefined,
      status: TourStatus.PUBLISHED,
      limit: "4",
    });

    // Remove the current tour from related tours
    const filteredRelatedTours = relatedToursResult.tours.filter(
      (relatedTour) => relatedTour._id.toString() !== tour._id.toString()
    );

    return {
      title: `${tour.title}`,
      tour,
      relatedTours: filteredRelatedTours.slice(0, 3),
      layout: "layouts/public",
      seo: {
        title: tour.seoTitle || `${tour.title}`,
        description: tour.seoDescription || tour.overview,
        keywords: tour.seoKeywords,
        canonicalUrl: tour.seoCanonicalUrl,
        ogImage: tour.seoOgImage || tour.coverImage,
      },
    };
  }

  @Get("dashboard/tours")
  @UseGuards(SessionAuthGuard)
  @Render("dashboard/tours/index")
  async getTours(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "150",
    @Query("search") search: string = "",
    @Query("countryId") countryId: string = "all",
    @Query("categoryId") categoryId: string = "all",
    @Query("status") status: TourStatus | "all" = "all",
    @Req() req
  ) {
    const filterOptions: any = {
      page,
      limit,
      search,
      country: countryId === "all" ? undefined : countryId,
      category: categoryId === "all" ? undefined : categoryId,
      status: status === "all" ? undefined : status,
    };

    if (req.user.role === UserRole.AGENT) {
      filterOptions.createdBy = req.user.id;
    }

    const {
      tours,
      totalDocs,
      limit: perPageLimit,
      totalPages,
      page: currentPage,
      hasNextPage,
      hasPrevPage,
      nextPage,
      prevPage,
    } = await this.toursService.findAll(filterOptions);

    const countries = await this.countriesService.findAll({});
    const categories = await this.categoriesService.findAll({});

    return {
      title: "Tours - Dashboard",
      tours,
      countries: countries.data,
      categories: categories.data,
      user: req.user,
      query: {
        page: currentPage.toString(),
        limit: perPageLimit.toString(),
        search,
        countryId,
        categoryId,
        status,
      },
      pagination: {
        totalDocs,
        totalPages,
        currentPage,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage,
      },
      layout: "layouts/dashboard",
      tourStatuses: Object.values(TourStatus),
    };
  }

  @Get("dashboard/tours/add")
  @UseGuards(SessionAuthGuard)
  @Render("dashboard/tours/add")
  async getAddTourPage(@Req() req) {
    const countries = await this.countriesService.findAll({});
    const categories = await this.categoriesService.findAll({});
    const destinations = await this.destinationsService.findAll({});

    return {
      title: "Add Tour - Dashboard",
      countries: countries.data,
      categories: categories.data,
      destinations: destinations.data,
      user: req.user,
      layout: "layouts/dashboard",
    };
  }

  @Post("dashboard/tours/add") 
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "coverImage", maxCount: 1 },
      { name: "galleryImages", maxCount: 10 },
    ])
  )
  async addTour(
    @Body() createTourDto: CreateTourDto,
    @UploadedFiles()
    uploadedFiles: {
      coverImage?: Express.Multer.File[];
      galleryImages?: Express.Multer.File[];
    },
    @Req() req,
    @Res() res: Response
  ) {
    try {
      const newCoverImageFile = uploadedFiles.coverImage
        ? uploadedFiles.coverImage[0]
        : null;
      const newGalleryImageFiles = uploadedFiles.galleryImages || [];

      // Save cover image path
      if (newCoverImageFile) {
        // Save cover image with local path
        createTourDto.coverImage = `/uploads/tours/${newCoverImageFile.filename}`;
      } else if (createTourDto.coverImage === "") {
        createTourDto.coverImage = null;
      }

      // Save gallery image paths
      if (newGalleryImageFiles.length > 0) {
        const galleryImageUrls: string[] = [];
        for (const file of newGalleryImageFiles) {
          const url = `/uploads/tours/${file.filename}`;
          galleryImageUrls.push(url);
        }
        createTourDto.galleryImages = galleryImageUrls;
      } else if (!createTourDto.galleryImages) {
        createTourDto.galleryImages = [];
      }

      const tourDataToSave: any = {
        ...createTourDto,
        countries: createTourDto.country ? (Array.isArray(createTourDto.country) ? createTourDto.country : [createTourDto.country]) : [],
        categories: createTourDto.category ? (Array.isArray(createTourDto.category) ? createTourDto.category : [createTourDto.category]) : [],
        destinations: createTourDto.destinations ? (Array.isArray(createTourDto.destinations) ? createTourDto.destinations : [createTourDto.destinations]) : [],
      };
      delete tourDataToSave.country;
      delete tourDataToSave.category;
      delete tourDataToSave.destinations;

      await this.toursService.create(tourDataToSave, req.user.id);

      req.flash("success_msg", "Tour added successfully");
      return res.redirect("/tours/dashboard/tours");
    } catch (error) {
      console.error("Error adding tour:", error);

      let flashMessage = "Failed to add tour.";

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
        flashMessage = error.message;
      }

      req.flash("error_msg", flashMessage);
      req.flash("oldInput", createTourDto);

      return res.redirect("/tours/dashboard/tours/add");
    }
  }

  @Get("dashboard/tours/edit/:id")
  @UseGuards(SessionAuthGuard)
  @Render("dashboard/tours/edit")
  async getEditTourPage(
    @Param("id") id: string,
    @Req() req,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const tour = await this.toursService.findOne(id);

      if (!tour) {
        req.flash("error_msg", "Tour not found.");
        return res.redirect("/tours/dashboard/tours");
      }

      // Check if user is authorized to edit this tour
      if (req.user.role === UserRole.AGENT && tour.createdBy.toString() !== req.user.id) {
        req.flash("error_msg", "You are not authorized to edit this tour");
        return res.redirect("/tours/dashboard/tours");
      }

      const countries = await this.countriesService.findAll({});
      const categories = await this.categoriesService.findAll({});
      const destinations = await this.destinationsService.findAll({});

      return {
        title: "Edit Tour - Dashboard",
        tour,
        countries: countries.data,
        categories: categories.data,
        destinations: destinations.data,
        user: req.user,
        layout: "layouts/dashboard",
        messages: req.flash(),
      };
    } catch (error) {
      console.error("Error fetching tour for edit:", error);
      req.flash("error_msg", error.message || "Failed to load tour for editing.");
      return res.redirect("/tours/dashboard/tours");
    }
  }

  @Patch("dashboard/tours/edit/:id")
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: "coverImage", maxCount: 1 },
      { name: "galleryImages", maxCount: 10 },
    ])
  )
  async updateTour(
    @Param("id") id: string,
    @Body() updateTourDto: UpdateTourDto,
    @UploadedFiles()
    uploadedFiles: {
      coverImage?: Express.Multer.File[];
      galleryImages?: Express.Multer.File[];
    },
    @Req() req,
    @Res() res: Response
  ) {
    try {
      const tour = await this.toursService.findOne(id);

      if (!tour) {
        req.flash("error_msg", "Tour not found.");
        return res.redirect("/dashboard/tours");
      }

      if (req.user.role === UserRole.AGENT && tour.createdBy.toString() !== req.user.id) {
        req.flash("error_msg", "You are not authorized to edit this tour");
        return res.redirect("/dashboard/tours");
      }

      const newCoverImageFile = uploadedFiles.coverImage
        ? uploadedFiles.coverImage[0]
        : null;
      const newGalleryImageFiles = uploadedFiles.galleryImages || [];

      // --- Handle cover image update logic ---
      if (newCoverImageFile) {
        // Upload new cover image
        const newCoverImageUrl = `/uploads/tours/${newCoverImageFile.filename}`;
        // If there was an old cover image, delete it
        if (tour.coverImage) {
          await this.localStorageService.deleteFile(tour.coverImage);
        }
        updateTourDto.coverImage = newCoverImageUrl;
      } else if (updateTourDto.coverImage === "") {
        // If user explicitly removed cover image
        if (tour.coverImage) {
          await this.localStorageService.deleteFile(tour.coverImage);
        }
        updateTourDto.coverImage = null;
      } else {
        // No new file, and not explicitly removed, so retain the existing one from the tour object
        updateTourDto.coverImage = tour.coverImage;
      }

      // --- Handle gallery images ---
      let currentGalleryImages = tour.galleryImages || [];

      // 1. Delete removed gallery images
      if (updateTourDto.removedGalleryImages && Array.isArray(updateTourDto.removedGalleryImages)) {
        for (const imageUrl of updateTourDto.removedGalleryImages) {
          await this.localStorageService.deleteFile(imageUrl);
        }
        currentGalleryImages = currentGalleryImages.filter(
          (img) => !updateTourDto.removedGalleryImages.includes(img)
        );
      }

      // 2. Upload newly uploaded gallery images
      const uploadedGalleryPaths: string[] = [];
      for (const file of newGalleryImageFiles) {
        const url = `/uploads/tours/${file.filename}`;
        uploadedGalleryPaths.push(url);
      }
      updateTourDto.galleryImages = [...currentGalleryImages, ...uploadedGalleryPaths];

      const tourDataToUpdate: any = {
        ...updateTourDto,
        countries: updateTourDto.country
          ? Array.isArray(updateTourDto.country)
            ? updateTourDto.country
            : [updateTourDto.country]
          : [],
        categories: updateTourDto.category
          ? Array.isArray(updateTourDto.category)
            ? updateTourDto.category
            : [updateTourDto.category]
          : [],
        destinations: updateTourDto.destinations
          ? Array.isArray(updateTourDto.destinations)
            ? updateTourDto.destinations
            : [updateTourDto.destinations]
          : [],
      };
      delete tourDataToUpdate.country;
      delete tourDataToUpdate.category;
      delete tourDataToUpdate.destinations;
      // Remove this to prevent accidentally saving an empty array if no files were actually removed
      delete tourDataToUpdate.removedGalleryImages;

      await this.toursService.update(id, tourDataToUpdate, req.user.id);

      req.flash("success_msg", "Tour updated successfully");
      return res.redirect("/tours/dashboard/tours");
    } catch (error) {
      console.error("Error updating tour:", error);
      req.flash("error_msg", error.message || "Failed to update tour.");
      return res.redirect(`/dashboard/tours/edit/${id}`);
    }
  }

  @Delete("dashboard/tours/:id")
  @UseGuards(SessionAuthGuard)
  async deleteTour(
    @Param("id") id: string,
    @Req() req,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const tour = await this.toursService.findOne(id); // Fetch tour for authorization and image deletion

      if (!tour) {
        req.flash("error_msg", "Tour not found.");
        return res.redirect("/tours/dashboard/tours");
      }

      // Check if user is authorized to delete this tour
      if (req.user.role === UserRole.AGENT && tour.createdBy.toString() !== req.user.id) {
        req.flash("error_msg", "You are not authorized to delete this tour");
        return res.redirect("/tours/dashboard/tours");
      }

      // --- Delete associated images before deleting the tour ---
      if (tour.coverImage) {
        await this.localStorageService.deleteFile(tour.coverImage);
      }
      if (tour.galleryImages && tour.galleryImages.length > 0) {
        for (const imageUrl of tour.galleryImages) {
          await this.localStorageService.deleteFile(imageUrl);
        }
      }

      await this.toursService.remove(id);

      req.flash("success_msg", "Tour deleted successfully");
      return res.redirect("/tours/dashboard/tours");
    } catch (error) {
      console.error("Error deleting tour:", error);
      req.flash("error_msg", error.message || "Failed to delete tour.");
      return res.redirect("/tours/dashboard/tours");
    }
  }

  @Patch("dashboard/tours/:id/status/:status")
  @UseGuards(SessionAuthGuard)
  async updateTourStatus(
    @Param("id") id: string,
    @Param("status") status: TourStatus,
    @Req() req,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const tour = await this.toursService.findOne(id);

      if (!tour) {
        req.flash("error_msg", "Tour not found.");
        return res.redirect("/tours/dashboard/tours");
      }

      if (req.user.role === UserRole.AGENT && tour.createdBy.toString() !== req.user.id) {
        req.flash("error_msg", "You are not authorized to update this tour");
        return res.redirect("/tours/dashboard/tours");
      }

      await this.toursService.updateStatus(id, status, req.user.id);

      req.flash("success_msg", `Tour status updated to ${status}`);
      return res.redirect("/tours/dashboard/tours");
    } catch (error) {
      console.error("Error updating tour status:", error);
      req.flash("error_msg", error.message || "Failed to update tour status.");
      return res.redirect("/tours/dashboard/tours");
    }
  }

  @Patch("dashboard/tours/:id/featured")
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async toggleFeatured(
    @Param("id") id: string,
    @Req() req,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      await this.toursService.toggleFeatured(id, req.user.id);

      req.flash("success_msg", "Tour featured status toggled successfully");
      return res.redirect("/tours/dashboard/tours");
    } catch (error) {
      console.error("Error toggling featured status:", error);
      req.flash(
        "error_msg",
        error.message || "Failed to toggle featured status."
      );
      return res.redirect("/tours/dashboard/tours");
    }
  }
}