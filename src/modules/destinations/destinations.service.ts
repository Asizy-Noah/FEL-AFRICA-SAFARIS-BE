// src/modules/destinations/destinations.service.ts

import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Destination } from './schemas/destination.schema';

@Injectable()
export class DestinationsService {
  constructor(
    @InjectModel(Destination.name) private destinationModel: Model<Destination>,
  ) {}

  async create(dto: any, userId: string) {
    // 1. Generate slug from name if not provided
    const slug = dto.slug || dto.name
        .toLowerCase()
        .replace(/[^\w ]+/g, '')
        .replace(/ +/g, '-');

    try {
        const created = new this.destinationModel({ 
            ...dto, // Use dto here so slug is included
            slug,   // Explicitly ensure slug is included
            createdBy: userId,
            updatedBy: userId 
        });
        return await created.save();
    } catch (error) {
        if (error.code === 11000) {
            throw new BadRequestException('A destination with this name/slug already exists');
        }
        throw new InternalServerErrorException('Failed to create destination');
    }
}

  async findAll(filter = {}) {
    // Populate country and categories so the index page can show names, not just IDs
    const docs = await this.destinationModel
      .find(filter)
      .populate('country', 'name slug code')
      .populate('categories', 'name')
      .sort({ createdAt: -1 })
      .exec();
    return { data: docs };
  }

  async findOne(id: string) {
    const doc = await this.destinationModel
      .findById(id)
      .populate('country')
      .populate('categories')
      .exec();
    if (!doc) throw new NotFoundException('Destination not found');
    return doc;
  }

  async update(id: string, data: any, userId: string) {
  try {
    // 1. If name is present but slug isn't, generate it
    if (data.name && !data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^\w ]+/g, '') // Remove special chars
        .replace(/ +/g, '-');    // Replace spaces with hyphens
    }

    // 2. Perform the update
    const updatedDestination = await this.destinationModel
      .findByIdAndUpdate(
        id, 
        { ...data, updatedBy: userId }, 
        { new: true }
      )
      .exec();

    if (!updatedDestination) {
      throw new NotFoundException(`Destination with ID ${id} not found`);
    }

    return updatedDestination;
  } catch (error) {
    // Handle duplicate slug errors (MongoDB error code 11000)
    if (error.code === 11000) {
      throw new BadRequestException('A destination with this slug already exists.');
    }
    console.error('Update Error:', error);
    throw new InternalServerErrorException('Failed to update destination');
  }
}

  async remove(id: string) {
    return await this.destinationModel.findByIdAndDelete(id).exec();
  }

  async findByCountries(countryIds: string[]): Promise<Destination[]> {
  return this.destinationModel
    .find({ country: { $in: countryIds } }) // Note: check if field is 'country' or 'countries'
    .sort({ name: 1 })
    .exec();
}

async searchForBlogs(q: string) {
    return this.destinationModel // or this.categoryModel, etc.
        .find({ name: { $regex: q, $options: 'i' } })
        .select('name _id')
        .limit(10)
        .exec();
}

async findBySlug(slug: string) {
  const doc = await this.destinationModel
    .findOne({ slug }) // Assuming your schema has a 'slug' field
    .populate('country')
    .populate('categories')
    .exec();
    
  if (!doc) throw new NotFoundException(`Destination with slug "${slug}" not found`);
  return doc;
}
// Add this inside the DestinationsService class

async findByCountry(countryId: string, limit: number = 5): Promise<Destination[]> {
    return this.destinationModel
        .find({ country: countryId }) 
        .sort({ name: 1 })
        .limit(limit)
        .exec();
}

// E:\WD\FEEL AFRICA SAFARIS BE\src\destinations\destinations.service.ts

async findByCountryforCountryPage(countryId: string): Promise<Destination[]> {
    return this.destinationModel
        .find({ country: countryId }) 
        .populate('categories') // Crucial for your JS "Interest" filter to work
        .sort({ name: 1 })       // Keeps them alphabetical
        // .limit(limit) <--- REMOVE THIS LINE ENTIRELY
        .exec();
}
}