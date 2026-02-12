import { Controller, Get, Render, Req, UseGuards, Post, Query, Body, UploadedFile, UseInterceptors, Res, Param, Patch, Delete } from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { DestinationsService } from './destinations.service';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { CountriesService } from '../countries/countries.service';
import { CategoriesService } from '../categories/categories.service';
import { getMulterConfig } from '../../config/multer.config';
import { LocalStorageService } from '../google-cloud/local-storage.service';
import { Response } from 'express';

@Controller('destinations')
export class DestinationsController {
  constructor(
    private readonly destinationsService: DestinationsService,
    private readonly countriesService: CountriesService,
    private readonly categoriesService: CategoriesService,
    private readonly localStorageService: LocalStorageService,
  ) {}

    @Get('dashboard/destinations')
  @UseGuards(SessionAuthGuard)
  @Render('dashboard/destinations/index')
  async getIndex(@Req() req, @Query() query: any) {
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
    const categories = await this.categoriesService.findAll({});

    return {
      title: 'Add Destination - Dashboard',
      countries: countries.data,
      categories: categories.data,
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
        createDestinationDto.coverImage = `/uploads/destinations/${file.filename}`;
      } else if (createDestinationDto.coverImage === '') {
        createDestinationDto.coverImage = null;
      }

      // ensure categories is array
      if (createDestinationDto.categories && !Array.isArray(createDestinationDto.categories)) {
        createDestinationDto.categories = [createDestinationDto.categories];
      }

      await this.destinationsService.create(createDestinationDto, req.user.id);
      req.flash('success_msg', 'Destination added successfully');
      return res.redirect('/destinations/dashboard/destinations');
    } catch (error) {
      console.error('Error adding destination:', error);
      req.flash('error_msg', error.message || 'Failed to add destination');
      req.flash('oldInput', createDestinationDto);
      return res.redirect('/destinations/dashboard/destinations/add');
    }
  }

  @Get('dashboard/destinations/edit/:id')
  @UseGuards(SessionAuthGuard)
  @Render('dashboard/destinations/edit')
  async getEdit(@Param('id') id: string, @Req() req) {
    const destination = await this.destinationsService.findOne(id);
    if (!destination) {
      req.flash('error_msg', 'Destination not found');
      return { layout: 'layouts/dashboard', user: req.user };
    }
    const countries = await this.countriesService.findAll({});
    const categories = await this.categoriesService.findAll({});

    return {
      title: 'Edit Destination - Dashboard',
      destination,
      countries: countries.data,
      categories: categories.data,
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
    @Res() res: Response,
  ) {
    try {
      const existing = await this.destinationsService.findOne(id);
      if (!existing) {
        req.flash('error_msg', 'Destination not found');
        return res.redirect('/destinations/dashboard/destinations');
      }

      if (file) {
        const newPath = `/uploads/destinations/${file.filename}`;
        if (existing.coverImage) {
          await this.localStorageService.deleteFile(existing.coverImage);
        }
        updateDestinationDto.coverImage = newPath;
      } else if (updateDestinationDto.coverImage === '') {
        if (existing.coverImage) {
          await this.localStorageService.deleteFile(existing.coverImage);
        }
        updateDestinationDto.coverImage = null;
      } else {
        updateDestinationDto.coverImage = existing.coverImage;
      }

      if (updateDestinationDto.categories && !Array.isArray(updateDestinationDto.categories)) {
        updateDestinationDto.categories = [updateDestinationDto.categories];
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
      console.error('Error deleting destination:', error);
      req.flash('error_msg', error.message || 'Failed to delete destination');
      return res.redirect('/destinations/dashboard/destinations');
    }
  }
}
