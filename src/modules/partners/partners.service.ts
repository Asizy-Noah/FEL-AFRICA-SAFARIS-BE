import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Partner, PartnerDocument } from './schemas/partners.schema';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
  constructor(
    @InjectModel(Partner.name) private partnerModel: Model<PartnerDocument>,
  ) {}

  async findAll(): Promise<Partner[]> {
    return this.partnerModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Partner> {
    const partner = await this.partnerModel.findById(id).exec();
    if (!partner) throw new NotFoundException('Partner not found');
    return partner;
  }

  async create(createPartnerDto: CreatePartnerDto, userId: string): Promise<Partner> {
    const newPartner = new this.partnerModel({
      ...createPartnerDto,
      createdBy: new Types.ObjectId(userId),
    });
    return newPartner.save();
  }

  async update(id: string, updatePartnerDto: UpdatePartnerDto, userId: string): Promise<Partner> {
    const updatedPartner = await this.partnerModel.findByIdAndUpdate(
      id,
      { $set: { ...updatePartnerDto, updatedBy: new Types.ObjectId(userId) } },
      { new: true },
    ).exec();
    if (!updatedPartner) throw new NotFoundException('Partner not found');
    return updatedPartner;
  }

  async remove(id: string): Promise<Partner> {
    const deleted = await this.partnerModel.findByIdAndDelete(id).exec();
    if (!deleted) throw new NotFoundException('Partner not found');
    return deleted;
  }
}