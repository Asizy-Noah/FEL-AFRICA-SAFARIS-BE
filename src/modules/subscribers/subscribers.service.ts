import { Injectable, NotFoundException, ConflictException } from "@nestjs/common"
import { Model } from "mongoose"
import { InjectModel } from "@nestjs/mongoose" // Import InjectModel

import { Subscriber } from "./schemas/subscriber.schema"
import { CreateSubscriberDto } from "./dto/create-subscriber.dto"
import { UpdateSubscriberDto } from "./dto/update-subscriber.dto"
import { MailService } from "../mail/mail.service"

@Injectable()
export class SubscribersService {
  constructor(
    // 1. Inject the Subscriber Model using @InjectModel
    @InjectModel(Subscriber.name) private subscriberModel: Model<Subscriber>,
    // 2. Inject MailService (which is available because MailModule is imported)
    private mailService: MailService,
  ) {
    // You no longer need these lines as the 'private' keyword in the constructor
    // automatically assigns them to properties of the class.
    // this.subscriberModel = subscriberModel;
    // this.mailService = mailService;
  }

  async create(createSubscriberDto: CreateSubscriberDto): Promise<Subscriber> {
    
    // Check if subscriber with same email already exists
    const existingSubscriber = await this.subscriberModel.findOne({ email: createSubscriberDto.email });

    if (existingSubscriber) {
      if (existingSubscriber.isActive) {
        
        throw new ConflictException("Email is already subscribed to our newsletter");
      } else {
        // If subscriber exists but is inactive, reactivate them
        
        existingSubscriber.isActive = true;
        // Update other fields if provided in dto (optional, depending on your logic)
        if (createSubscriberDto.name) existingSubscriber.name = createSubscriberDto.name;
        if (createSubscriberDto.phoneNumber) existingSubscriber.phoneNumber = createSubscriberDto.phoneNumber;

        const reactivatedSubscriber = await existingSubscriber.save();
        
        // Send confirmation email to reactivated subscriber
        await this.mailService.sendSubscriptionConfirmation(reactivatedSubscriber);
        // No need to send admin notification again for reactivation, as they were already subscribed.
        
        return reactivatedSubscriber;
      }
    }

    // If no existing subscriber, create a new one
    
    const newSubscriber = new this.subscriberModel(createSubscriberDto);
    const savedSubscriber = await newSubscriber.save();

    // Send confirmation email to new subscriber
    await this.mailService.sendSubscriptionConfirmation(savedSubscriber);
    // Send notification email to admin
    await this.mailService.sendNewSubscriberNotification(savedSubscriber);
    
    return savedSubscriber;
  }


  async findAll(query?: any): Promise<Subscriber[]> {
    const filter: any = {}

    // Handle search query
    if (query && query.search) {
      filter.$text = { $search: query.search }
    }

    // Filter by active status
    if (query && query.isActive !== undefined) {
      filter.isActive = query.isActive === "true"
    }

    return this.subscriberModel.find(filter).sort({ createdAt: -1 }).exec()
  }

  async findOne(id: string): Promise<Subscriber> {
    const subscriber = await this.subscriberModel.findById(id).exec()

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with ID ${id} not found`)
    }

    return subscriber
  }

  async update(id: string, updateSubscriberDto: UpdateSubscriberDto): Promise<Subscriber> {
    const updatedSubscriber = await this.subscriberModel
      .findByIdAndUpdate(id, updateSubscriberDto, { new: true })
      .exec()

    if (!updatedSubscriber) {
      throw new NotFoundException(`Subscriber with ID ${id} not found`)
    }

    return updatedSubscriber
  }

  async remove(id: string): Promise<Subscriber> {
    const deletedSubscriber = await this.subscriberModel.findByIdAndDelete(id).exec()

    if (!deletedSubscriber) {
      throw new NotFoundException(`Subscriber with ID ${id} not found`)
    }

    return deletedSubscriber
  }

  async toggleActive(id: string): Promise<Subscriber> {
    const subscriber = await this.subscriberModel.findById(id).exec()

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with ID ${id} not found`)
    }

    subscriber.isActive = !subscriber.isActive
    return subscriber.save()
  }
}