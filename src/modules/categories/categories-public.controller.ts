import {
  Controller,
  Get,
  Render,
  Param,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { CategoriesService } from "./categories.service";
import { ToursService } from "../tours/tours.service"; // Import ToursService

@Controller('categories')
export class CategoriesPublicController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly toursService: ToursService,
  ) {}

  @Get(":slug")
  @Render("public/categories/show")
  async getCategory(
    @Param("slug") slug: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      // Find category and populate its associated country
      const category = await this.categoriesService.findBySlug(slug);

      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }

      let tours = [];
      if (category.country) { // Check if the category is linked to a country
        // Fetch tours that belong to this category AND this category's country
        tours = await this.toursService.findByCategory(
          category._id.toString(),
          category.country._id.toString() // <--- PASS THE COUNTRY ID HERE
        );
      } else {
        // Handle categories not linked to a specific country (e.g., "All African Safaris")
        // You might fetch tours only by category ID, or display a different message.
        // For now, we'll fetch tours only by category if no country is linked.
        tours = await this.toursService.findByCategory(category._id.toString());
      }


      return {
        title: `${category.name}`,
        category,
        tours,
        layout: "layouts/public",
        messages: req.flash(),
        seo: {
          title: category.seoTitle || `${category.name}`,
          description: category.seoDescription || category.description,
          keywords: category.seoKeywords,
          canonicalUrl: `YOUR_BASE_URL/categories/${category.slug}`, // Update with your actual base URL
          ogImage: category.image,
        },
      };
    } catch (error) {
      console.error(`Error loading category page for slug ${slug}:`, error);
      req.flash('error_msg', error.message || 'Category not found or an error occurred.');
      return res.redirect('/');
    }
  }
}