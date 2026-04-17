import { 
  Controller, Get, Post, Body, Param, Delete, Patch, 
  UseInterceptors, UploadedFile, UseGuards, Req, Res, NotFoundException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { getMulterConfig } from '../../config/multer.config';
import { LocalStorageService } from '../google-cloud/local-storage.service';
import { Response } from 'express';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';

@Controller('partners')
@UseGuards(SessionAuthGuard)
export class PartnersController {
  constructor(
    private readonly partnersService: PartnersService,
    private readonly storageService: LocalStorageService,
  ) {}

  @Get('dashboard')
  async index(@Req() req: any, @Res() res: Response) {
    const partners = await this.partnersService.findAll();
    return res.render('dashboard/partners/index', {
      partners,
      title: 'Manage Partners - Dashboard',
      user: req.user,
      layout: 'layouts/dashboard',
      messages: req.flash(),
    });
  }

  @Get('dashboard/add')
  async addPage(@Req() req: any, @Res() res: Response) {
    return res.render('dashboard/partners/add', {
      title: 'Add Partner - Dashboard',
      user: req.user,
      layout: 'layouts/dashboard',
      messages: req.flash(),
    });
  }

  @Get('dashboard/edit/:id')
  async editPage(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const partner = await this.partnersService.findOne(id);
    return res.render('dashboard/partners/edit', {
      partner,
      title: 'Edit Partner - Dashboard',
      user: req.user,
      layout: 'layouts/dashboard',
      messages: req.flash(),
    });
  }

  @Post('dashboard/add')
  @UseInterceptors(FileInterceptor('logo', getMulterConfig('partners')))
  async create(
    @Body() createPartnerDto: CreatePartnerDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (file) {
      createPartnerDto.logo = `/uploads/partners/${file.filename}`;
    }
    await this.partnersService.create(createPartnerDto, req.user.id);
    req.flash('success_msg', 'Partner added successfully');
    return res.redirect('/partners/dashboard');
  }

  @Patch('dashboard/edit/:id')
  @UseInterceptors(FileInterceptor('logo', getMulterConfig('partners')))
  async update(
    @Param('id') id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const existing = await this.partnersService.findOne(id);
    
    if (file) {
      if (existing.logo) await this.storageService.deleteFile(existing.logo);
      updatePartnerDto.logo = `/uploads/partners/${file.filename}`;
    }

    await this.partnersService.update(id, updatePartnerDto, req.user.id);
    req.flash('success_msg', 'Partner updated successfully');
    return res.redirect('/partners/dashboard');
  }

  @Delete('dashboard/delete/:id')
  async remove(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const partner = await this.partnersService.findOne(id);
    if (partner.logo) await this.storageService.deleteFile(partner.logo);
    await this.partnersService.remove(id);
    req.flash('success_msg', 'Partner deleted successfully');
    return res.redirect('/partners/dashboard');
  }
}