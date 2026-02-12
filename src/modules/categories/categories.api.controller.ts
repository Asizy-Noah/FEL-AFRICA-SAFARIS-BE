// src/modules/categories/categories.api.controller.ts
import { Controller, Get, Param, Query, UseGuards, } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { SessionAuthGuard } from "../auth/guards/session-auth.guard";

@Controller("api/categories") // Base route for the API endpoints
export class CategoriesApiController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async getAllCategoriesApi(
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
    @Query("search") search: string,
    @Query("countryId") countryId: string = "all", // This allows filtering by country directly on the /api/categories route
  ) {
    const categoriesResult = await this.categoriesService.findAll({ page, limit, search, countryId });
    // You might want to return the full pagination object here for API consumers
    return categoriesResult;
  }

  @Get('by-country/:countryId') // Define the route for fetching by country
  @UseGuards(SessionAuthGuard) // Protect this endpoint if necessary
  async getCategoriesByCountry(@Param('countryId') countryId: string) {
    const categories = await this.categoriesService.findByCountry(countryId);
    return { data: categories }; // Return categories in a 'data' property for consistency
  }
}