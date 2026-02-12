import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import { Booking, type BookingStatus } from "./schemas/booking.schema"
import { CreateBookingDto } from "./dto/create-booking.dto"
import { UpdateBookingDto } from "./dto/update-booking.dto"
import { MailService } from "../mail/mail.service"

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    private mailService: MailService,
  ) {}

  async create(createBookingDto: CreateBookingDto): Promise<Booking> {
    const newBooking = new this.bookingModel(createBookingDto)
    let savedBooking = await newBooking.save()

    // Populate the 'tour' field (only needs 'title')
    savedBooking = await savedBooking.populate('tour', 'title');

    // Send notification emails
    await this.mailService.sendBookingNotification(savedBooking)
    await this.mailService.sendBookingConfirmation(savedBooking)

    return savedBooking
  }

  async findAll(query?: any): Promise<Booking[]> {
    const filter: any = {}

    // Handle search query
    if (query && query.search) {
      filter.$text = { $search: query.search }
    }

    // Filter by status
    if (query && query.status) {
      filter.status = query.status
    }

    // Filter by tour
    if (query && query.tour) {
      filter.tour = query.tour
    }

    // Filter by assigned agent
    if (query && query.assignedTo) {
      filter.assignedTo = query.assignedTo
    }

    return this.bookingModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate("tour", "title slug")
      .populate("assignedTo", "name email")
      .populate("updatedBy", "name email")
      .exec()
  }

  async findOne(id: string): Promise<Booking> {
    const booking = await this.bookingModel
      .findById(id)
      .populate("tour", "title slug")
      .populate("assignedTo", "name email")
      .populate("updatedBy", "name email")
      .exec()

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`)
    }

    return booking
  }

  async update(id: string, updateBookingDto: UpdateBookingDto, userId?: string): Promise<Booking> {
    const booking = await this.bookingModel.findById(id).exec()

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`)
    }

    // Check if status is changing
    const isStatusChanging = updateBookingDto.status && updateBookingDto.status !== booking.status

    // Update the booking
    if (userId) {
      updateBookingDto.updatedBy = userId
    }

    const updatedBooking = await this.bookingModel.findByIdAndUpdate(id, updateBookingDto, { new: true }).exec()

    // If status is changing, send notification email
    if (isStatusChanging) {
      await this.mailService.sendBookingStatusUpdate(updatedBooking)
    }

    return updatedBooking
  }

  async remove(id: string): Promise<Booking> {
    const deletedBooking = await this.bookingModel.findByIdAndDelete(id).exec()

    if (!deletedBooking) {
      throw new NotFoundException(`Booking with ID ${id} not found`)
    }

    return deletedBooking
  }

  async updateStatus(id: string, status: BookingStatus, userId: string): Promise<Booking> {
    const booking = await this.bookingModel.findById(id).exec()

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`)
    }

    booking.status = status
    booking.updatedBy = new Types.ObjectId(userId)
    const updatedBooking = await booking.save()

    // Send notification email about status change
    await this.mailService.sendBookingStatusUpdate(updatedBooking)

    return updatedBooking
  }

  async assignToAgent(id: string, agentId: string, userId: string): Promise<Booking> {
    const booking = await this.bookingModel.findById(id).exec()

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`)
    }

    booking.assignedTo = new Types.ObjectId(userId)
    booking.updatedBy = new Types.ObjectId(userId)
    return booking.save()
  }
}
