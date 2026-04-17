// src/modules/destinations/destinations.controller.ts

import { Controller, Get, Render, Req, UseGuards, Post, Query, Body, UploadedFile, UseInterceptors, Res, Param, Patch, Delete, HttpStatus, HttpException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DestinationsService } from './destinations.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CountriesService } from '../countries/countries.service';
import { CategoriesService } from '../categories/categories.service';
import { getMulterConfig } from '../../config/multer.config';
import { LocalStorageService } from '../google-cloud/local-storage.service';
import { Response } from 'express';
import { ToursService } from '../tours/tours.service';

@Controller('destinations')
export class DestinationsController {
  constructor(
    private readonly destinationsService: DestinationsService,
    private readonly countriesService: CountriesService,
    private readonly categoriesService: CategoriesService,
    private readonly toursService: ToursService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  @Get('dashboard/destinations')
  @UseGuards(SessionAuthGuard)
  @Render('dashboard/destinations/index')
  async getIndex(@Req() req: any, @Query() query: any) {
    const list = await this.destinationsService.findAll();
    return {
      title: 'Manage Destinations - Dashboard',
      destinations: list.data,
      query,
      user: req.user,
      layout: 'layouts/dashboard',
      messages: req.flash(),
    };
  }

  @Get('dashboard/destinations/add')
  @UseGuards(SessionAuthGuard)
  @Render('dashboard/destinations/add')
  async getAdd(@Req() req) {
    const countries = await this.countriesService.findAll({});
    // We don't load categories here because they load via AJAX when country is selected
    return {
      title: 'Add Destination - Dashboard',
      countries: countries.data,
      user: req.user,
      layout: 'layouts/dashboard',
      messages: req.flash(),
    };
  }

  @Post('dashboard/destinations/add')
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FileInterceptor('coverImage', getMulterConfig('destinations')))
  async add(
    @Body() createDestinationDto: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
    @Res() res: Response,
  ) {
    try {
      if (file) {
        // Correct public path for local storage
        createDestinationDto.coverImage = `/uploads/destinations/${file.filename}`;
      }

      // Ensure categories is always an array (Multer/BodyParser quirk)
      if (createDestinationDto.categories) {
        createDestinationDto.categories = Array.isArray(createDestinationDto.categories) 
          ? createDestinationDto.categories 
          : [createDestinationDto.categories];
      }

      await this.destinationsService.create(createDestinationDto, req.user.id);
      req.flash('success_msg', 'Destination added successfully');
      return res.redirect('/destinations/dashboard/destinations');
    } catch (error) {
      console.error('Error adding destination:', error);
      req.flash('error_msg', error.message || 'Failed to add destination');
      return res.redirect('/destinations/dashboard/destinations/add');
    }
  }

  @Get('dashboard/destinations/edit/:id')
  @UseGuards(SessionAuthGuard)
  @Render('dashboard/destinations/edit')
  async getEdit(@Param('id') id: string, @Req() req, @Res() res: Response) {
    const destination = await this.destinationsService.findOne(id);
    if (!destination) {
      req.flash('error_msg', 'Destination not found');
      return res.redirect('/destinations/dashboard/destinations');
    }
    const countries = await this.countriesService.findAll({});

    return {
      title: 'Edit Destination - Dashboard',
      destination,
      countries: countries.data,
      user: req.user,
      layout: 'layouts/dashboard',
      messages: req.flash(),
    };
  }

  @Patch('dashboard/destinations/edit/:id')
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FileInterceptor('coverImage', getMulterConfig('destinations')))
  async update(
    @Param('id') id: string,
    @Body() updateDestinationDto: any,
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
    @Res() res: Response, // <--- Ensure this is here
  ) {
    try {
      const existing = await this.destinationsService.findOne(id);
      
      if (!existing) {
        req.flash('error_msg', 'Destination not found');
        // This line was likely causing your TS2552 error if 'res' wasn't recognized
        return res.redirect('/destinations/dashboard/destinations'); 
      }

      if (file) {
        const newPath = `/uploads/destinations/${file.filename}`;
        if (existing.coverImage) {
          // Use your storage service to clean up the old file
          await this.localStorageService.deleteFile(existing.coverImage);
        }
        updateDestinationDto.coverImage = newPath;
      } else if (req.body.removeImage === 'on') {
        if (existing.coverImage) {
          await this.localStorageService.deleteFile(existing.coverImage);
        }
        updateDestinationDto.coverImage = null;
      } else {
        // Keep existing image if no new file and not removed
        updateDestinationDto.coverImage = existing.coverImage;
      }

      // Handle the Categories array from the multiselect
      if (updateDestinationDto.categories) {
        updateDestinationDto.categories = Array.isArray(updateDestinationDto.categories) 
          ? updateDestinationDto.categories 
          : [updateDestinationDto.categories];
      } else {
        updateDestinationDto.categories = []; 
      }

      await this.destinationsService.update(id, updateDestinationDto, req.user.id);
      
      req.flash('success_msg', 'Destination updated successfully');
      return res.redirect('/destinations/dashboard/destinations');

    } catch (error) {
      console.error('Error updating destination:', error);
      req.flash('error_msg', error.message || 'Failed to update destination');
      return res.redirect(`/destinations/dashboard/destinations/edit/${id}`);
    }
  }

  @Delete('dashboard/destinations/:id')
  @UseGuards(SessionAuthGuard)
  async delete(@Param('id') id: string, @Req() req, @Res() res: Response) {
    try {
      const existing = await this.destinationsService.findOne(id);
      if (existing && existing.coverImage) {
        await this.localStorageService.deleteFile(existing.coverImage);
      }
      await this.destinationsService.remove(id);
      req.flash('success_msg', 'Destination deleted successfully');
      return res.redirect('/destinations/dashboard/destinations');
    } catch (error) {
      req.flash('error_msg', 'Failed to delete destination');
      return res.redirect('/destinations/dashboard/destinations');
    }
  }

  @Get('api/by-countries')
  async getByCountries(@Query('ids') ids: string) {
      const countryIds = ids.split(',');
      return this.destinationsService.findByCountries(countryIds);
  }

/* ======PUBLIC ROUTES======== */
@Get(':slug')
@Render('public/destinations/destination') // Updated to match your path
async getDestination(@Param('slug') slug: string, @Req() req: any) {
  const destination = await this.destinationsService.findBySlug(slug);

  if (!destination) {
    throw new HttpException('Destination not found', HttpStatus.NOT_FOUND);
  }

  // Fetch tours that belong to this destination
  // Assuming toursService has a findByDestination method
  const tours = await this.toursService.findByDestination(destination._id.toString());
  
  // Extract categories from the destination object itself
  const categories = destination.categories;

  return {
    title: destination.name,
    destination,
    categories, // Pass categories for the filter carousel
    tours,       // Pass tours for the grid
    layout: "layouts/public",
    selectedCategory: 'all',
    messages: req.flash(),
    seo: {
      title: destination.seoTitle || destination.name,
      description: destination.seoDescription || destination.description.substring(0, 160),
      keywords: destination.seoKeywords,
      ogImage: destination.coverImage,
    },
  };
}
}