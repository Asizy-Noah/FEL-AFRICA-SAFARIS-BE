import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Destination } from './schemas/destination.schema';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectModel(Destination.name) private destinationModel: Model<Destination>,
  ) {}

  async create(data: any, userId: string) {
    try {
      const created = new this.destinationModel({ ...data, createdBy: userId });
      return await created.save();
    } catch (error) {
      console.error('Error creating destination:', error);
      throw new InternalServerErrorException('Failed to create destination');
    }
  }

  async findAll(filter = {}) {
    const docs = await this.destinationModel.find(filter).sort({ createdAt: -1 }).exec();
    return { data: docs };
  }

  async findOne(id: string) {
    return this.destinationModel.findById(id).exec();
  }

  async update(id: string, data: any, userId: string) {
    try {
      return this.destinationModel.findByIdAndUpdate(id, { ...data, updatedBy: userId }, { new: true }).exec();
    } catch (error) {
      console.error('Error updating destination:', error);
      throw new InternalServerErrorException('Failed to update destination');
    }
  }

  async remove(id: string) {
    try {
      return this.destinationModel.findByIdAndDelete(id).exec();
    } catch (error) {
      console.error('Error deleting destination:', error);
      throw new InternalServerErrorException('Failed to delete destination');
    }
  }
}
