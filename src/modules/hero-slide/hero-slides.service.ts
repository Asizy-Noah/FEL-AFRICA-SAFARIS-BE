import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { HeroSlide, HeroSlideDocument } from './schemas/hero-slide.schema';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from './dto/update-hero-slide.dto';

@Injectable()
export class HeroSlidesService {
  constructor(
    @InjectModel(HeroSlide.name) private slideModel: Model<HeroSlideDocument>,
  ) {}

  async findAll(): Promise<HeroSlide[]> {
    return this.slideModel.find().sort({ order: 1, createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<HeroSlide> {
    const slide = await this.slideModel.findById(id).exec();
    if (!slide) throw new NotFoundException('Slide not found');
    return slide;
  }

  async create(dto: CreateHeroSlideDto, userId: string): Promise<HeroSlide> {
    const slide = new this.slideModel({
      ...dto,
      createdBy: new Types.ObjectId(userId),
    });
    return slide.save();
  }

  async update(id: string, dto: UpdateHeroSlideDto, userId: string): Promise<HeroSlide> {
    const updated = await this.slideModel.findByIdAndUpdate(
      id,
      { $set: { ...dto, updatedBy: new Types.ObjectId(userId) } },
      { new: true },
    ).exec();
    if (!updated) throw new NotFoundException('Slide not found');
    return updated;
  }

  async remove(id: string): Promise<HeroSlide> {
    const deleted = await this.slideModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Slide not found');
    return deleted;
  }
}