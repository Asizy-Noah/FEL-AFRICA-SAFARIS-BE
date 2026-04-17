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
  UploadedFiles,
  HttpException,
  HttpStatus,
  Patch,
  Delete,
  Session,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { diskStorage } from "multer";
import { extname, join } from "path";
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
@Render("public/tours/tour")
async getTour(@Param("slug") slug: string, @Session() session: Record<string, any>) {
  const tour = await this.toursService.findBySlug(slug);

  if (!tour) {
    throw new HttpException('Tour not found', HttpStatus.NOT_FOUND);
  }

  // 1. FIXED LOGIC FOR "YOU MAY ALSO BE INTERESTED IN"
  const relatedToursResult = await this.toursService.findAll({
    category: tour.categories.length > 0 
      ? (tour.categories[0] as any)._id?.toString() || tour.categories[0].toString() 
      : undefined,
    // Changed 'destination' to 'country' to match your Service's interface
    country: tour.countries && tour.countries.length > 0 
      ? (tour.countries[0] as any)._id?.toString() || tour.countries[0].toString() 
      : undefined,
    status: TourStatus.PUBLISHED,
    limit: "7", 
  });

  const relatedTours = relatedToursResult.tours
    .filter(t => t._id.toString() !== tour._id.toString())
    .slice(0, 6);

  // 2. LOGIC FOR "RECENTLY VIEWED"
  if (!session.recentlyViewed) {
    session.recentlyViewed = [];
  }

  const currentTourData = {
    _id: tour._id,
    title: tour.title,
    slug: tour.slug,
    coverImage: tour.coverImage,
    days: tour.days,
    price: tour.price,
    overview: tour.overview,
    groupSize: tour.groupSize
  };

  // Update session: current tour moves to front, unique entries only, limit to 6
  const filteredHistory = session.recentlyViewed.filter(
    (t: any) => t._id.toString() !== tour._id.toString()
  );
  
  session.recentlyViewed = [currentTourData, ...filteredHistory].slice(0, 6);

  return {
    title: `${tour.title}`,
    tour,
    relatedTours,
    recentlyViewed: session.recentlyViewed,
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
    FileFieldsInterceptor(
      [
        { name: "coverImage", maxCount: 1 },
        { name: "galleryImages", maxCount: 10 },
      ],
      {
        storage: diskStorage({
          destination: "./public/uploads/tours",
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
      }
    )
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
      // 1. Handle Images
      if (uploadedFiles?.coverImage?.[0]) {
        createTourDto.coverImage = `/uploads/tours/${uploadedFiles.coverImage[0].filename}`;
      }

      if (uploadedFiles?.galleryImages) {
        createTourDto.galleryImages = uploadedFiles.galleryImages.map(
          (file) => `/uploads/tours/${file.filename}`
        );
      }

      // 2. Fix property mismatch and ensure arrays
      // We use createTourDto.countries because that is what your DTO now expects
      const tourDataToSave = {
        ...createTourDto,
        countries: Array.isArray(createTourDto.countries) ? createTourDto.countries : [createTourDto.countries].filter(Boolean),
        categories: Array.isArray(createTourDto.categories) ? createTourDto.categories : [createTourDto.categories].filter(Boolean),
        destinations: Array.isArray(createTourDto.destinations) ? createTourDto.destinations : [createTourDto.destinations].filter(Boolean),
      };

      await this.toursService.create(tourDataToSave, req.user.id);

      req.flash("success_msg", "Tour added successfully");
      return res.redirect("/tours/dashboard/tours");
    } catch (error) {
      console.error("Error adding tour:", error);
      req.flash("error_msg", error.message || "Failed to add tour.");
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
    FileFieldsInterceptor(
      [
        { name: "coverImage", maxCount: 1 },
        { name: "galleryImages", maxCount: 10 },
      ],
      {
        storage: diskStorage({
          destination: "./public/uploads/tours",
          filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
          },
        }),
      }
    )
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
      if (!tour) throw new Error("Tour not found");

      // Handle Cover Image Update
      if (uploadedFiles?.coverImage?.[0]) {
        if (tour.coverImage) await this.localStorageService.deleteFile(tour.coverImage);
        updateTourDto.coverImage = `/uploads/tours/${uploadedFiles.coverImage[0].filename}`;
      }

      // Handle Gallery Images Update
      let currentGallery = tour.galleryImages || [];
      if (updateTourDto.removedGalleryImages) {
        const removed = Array.isArray(updateTourDto.removedGalleryImages) 
                        ? updateTourDto.removedGalleryImages 
                        : [updateTourDto.removedGalleryImages];
        
        for (const img of removed) {
          await this.localStorageService.deleteFile(img);
        }
        currentGallery = currentGallery.filter(img => !removed.includes(img));
      }

      const newGalleryPaths = uploadedFiles?.galleryImages?.map(f => `/uploads/tours/${f.filename}`) || [];
      updateTourDto.galleryImages = [...currentGallery, ...newGalleryPaths];

      // Fix array logic for plurals
      const tourDataToUpdate = {
        ...updateTourDto,
        countries: Array.isArray(updateTourDto.countries) ? updateTourDto.countries : [updateTourDto.countries].filter(Boolean),
        categories: Array.isArray(updateTourDto.categories) ? updateTourDto.categories : [updateTourDto.categories].filter(Boolean),
        destinations: Array.isArray(updateTourDto.destinations) ? updateTourDto.destinations : [updateTourDto.destinations].filter(Boolean),
      };

      delete (tourDataToUpdate as any).removedGalleryImages;

      await this.toursService.update(id, tourDataToUpdate, req.user.id);

      req.flash("success_msg", "Tour updated successfully");
      return res.redirect("/tours/dashboard/tours");
    } catch (error) {
      console.error("Error updating tour:", error);
      req.flash("error_msg", error.message);
      return res.redirect(`/tours/dashboard/tours/edit/${id}`);
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