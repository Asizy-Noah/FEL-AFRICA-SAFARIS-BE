import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CountriesService } from '../../modules/countries/countries.service'; // Adjust path

@Injectable()
export class HeaderDataMiddleware implements NestMiddleware {
  constructor(private readonly countriesService: CountriesService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Only fetch for public-facing routes if needed, or if layout is 'public'
    // You might refine this condition based on your application's needs
    // For simplicity, let's assume it runs on routes that *might* use the public layout.
    // If you only want it for routes using 'layouts/public', you'd need a more complex check
    // or apply it selectively in app.module.ts.

    const staticCountries = await this.countriesService.findStaticHeaderCountries();
    const otherCountries = await this.countriesService.findOtherHeaderCountries();

    // Make the data available to all templates rendered after this middleware
    // via res.locals, which is accessible directly in EJS
    res.locals.headerStaticCountries = staticCountries;
    res.locals.headerOtherCountries = otherCountries;

    next();
  }
}