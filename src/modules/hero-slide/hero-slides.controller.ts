import { 
  Controller, Get, Post, Body, Param, Delete, Patch, 
  UseInterceptors, UploadedFile, UseGuards, Req, Res, NotFoundException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { HeroSlidesService } from './hero-slides.service';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from './dto/update-hero-slide.dto';
import { getMulterConfig } from '../../config/multer.config';
import { LocalStorageService } from '../google-cloud/local-storage.service';
import { Response } from 'express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';

@Controller('hero-slides')
@UseGuards(SessionAuthGuard)
export class HeroSlidesController {
  constructor(
    private readonly slidesService: HeroSlidesService,
    private readonly storageService: LocalStorageService,
  ) {}

  @Get('dashboard')
  async index(@Req() req: any, @Res() res: Response) {
    const slides = await this.slidesService.findAll();
    return res.render('dashboard/hero-slides/index', {
      slides,
      title: 'Home Carousel - Dashboard',
      user: req.user,
      layout: 'layouts/dashboard',
      messages: req.flash(),
    });
  }

  @Get('dashboard/add')
  async addPage(@Req() req: any, @Res() res: Response) {
    return res.render('dashboard/hero-slides/add', {
      title: 'Add New Slide - Dashboard',
      user: req.user,
      layout: 'layouts/dashboard',
      messages: req.flash(),
    });
  }

  @Get('dashboard/edit/:id')
  async editPage(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const slide = await this.slidesService.findOne(id);
    return res.render('dashboard/hero-slides/edit', {
      slide,
      title: 'Edit Slide - Dashboard',
      user: req.user,
      layout: 'layouts/dashboard',
      messages: req.flash(),
    });
  }

  @Post('dashboard/add')
  @UseInterceptors(FileInterceptor('photo', getMulterConfig('hero')))
  async create(
    @Body() dto: CreateHeroSlideDto, 
    @UploadedFile() file: Express.Multer.File, 
    @Req() req: any, 
    @Res() res: Response
  ) {
    if (file) dto.photo = `/uploads/hero/${file.filename}`;
    await this.slidesService.create(dto, req.user.id);
    req.flash('success_msg', 'Slide created successfully');
    return res.redirect('/hero-slides/dashboard');
  }

  @Patch('dashboard/edit/:id')
  @UseInterceptors(FileInterceptor('photo', getMulterConfig('hero')))
  async update(
    @Param('id') id: string, 
    @Body() dto: UpdateHeroSlideDto, 
    @UploadedFile() file: Express.Multer.File, 
    @Req() req: any, 
    @Res() res: Response
  ) {
    const existing = await this.slidesService.findOne(id);
    if (file) {
      if (existing.photo) await this.storageService.deleteFile(existing.photo);
      dto.photo = `/uploads/hero/${file.filename}`;
    }
    await this.slidesService.update(id, dto, req.user.id);
    req.flash('success_msg', 'Slide updated successfully');
    return res.redirect('/hero-slides/dashboard');
  }

  @Delete('dashboard/delete/:id')
  async remove(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const slide = await this.slidesService.findOne(id);
    if (slide.photo) await this.storageService.deleteFile(slide.photo);
    await this.slidesService.remove(id);
    req.flash('success_msg', 'Slide deleted');
    return res.redirect('/hero-slides/dashboard');
  }
}