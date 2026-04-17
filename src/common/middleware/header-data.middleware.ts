import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CountriesService } from '../../modules/countries/countries.service';
import { DestinationsService } from '../../modules/destinations/destinations.service';

@Injectable()
export class HeaderDataMiddleware implements NestMiddleware {
  constructor(
    private readonly countriesService: CountriesService,
    private readonly destinationsService: DestinationsService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Fetch Country Data (using your specific service methods)
      const staticCountries = await this.countriesService.findStaticHeaderCountries();
      const otherCountries = await this.countriesService.findOtherHeaderCountries();

      // 2. Fetch Destination Data
      // We use .findAll() and take the data array
      const destinationsList = await this.destinationsService.findAll();
      const allDestinations = destinationsList.data || [];

      // 3. Inject into res.locals for EJS access
      res.locals.headerStaticCountries = staticCountries;
      res.locals.headerOtherCountries = otherCountries;
      res.locals.allDestinations = allDestinations;

    } catch (error) {
      console.error('Header Middleware Data Fetch Error:', error);
      // Fallbacks to prevent EJS from crashing if DB is down
      res.locals.headerStaticCountries = [];
      res.locals.headerOtherCountries = [];
      res.locals.allDestinations = [];
    }

    next();
  }
}