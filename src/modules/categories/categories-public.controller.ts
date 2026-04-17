// src/modules/categories/categories-public.controller.ts
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
import { ToursService } from "../tours/tours.service";

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
      // Find category and populate its associated countries array
      const category = await this.categoriesService.findBySlug(slug);

      if (!category) {
        throw new HttpException('Category not found', HttpStatus.NOT_FOUND);
      }

      let tours = [];
      
      // Check if the category has associated countries in the array
      if (category.countries && category.countries.length > 0) {
        // Extract all country IDs from the array
        const countryIds = category.countries.map(country => 
          (country as any)._id ? (country as any)._id.toString() : country.toString()
        );

        // Fetch tours that belong to this category AND ANY of these countries
        // Note: Ensure your toursService.findByCategory is updated to handle an array of IDs
        // If it doesn't, passing the first ID is the safest fallback: countryIds[0]
        tours = await this.toursService.findByCategory(
          category._id.toString(),
          countryIds // Passing the array of IDs
        );
      } else {
        // Handle categories not linked to a specific country
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
          canonicalUrl: `https://yourdomain.com/categories/${category.slug}`, 
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