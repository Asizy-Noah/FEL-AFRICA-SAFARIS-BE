// src/modules/users/users.service.ts

import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import type { Model } from "mongoose"
import { User, UserRole, UserStatus } from "./schemas/user.schema"
import { CreateUserDto } from "./dto/create-user.dto"
import { UpdateUserDto } from "./dto/update-user.dto"
import { MailService } from "../mail/mail.service"
import * as crypto from "crypto"
import * as bcrypt from "bcrypt" // Import bcrypt

@Injectable()
export class UsersService {
  constructor(
    private mailService: MailService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if passwords match
    if (createUserDto.password !== createUserDto.confirmPassword) {
      throw new BadRequestException("Passwords do not match")
    }

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: createUserDto.email })
    if (existingUser) {
      throw new ConflictException("User with this email already exists")
    }

    // Create new user
    const newUser = new this.userModel(createUserDto)

    // Set default status based on role
    if (newUser.role === UserRole.ADMIN) {
      newUser.status = UserStatus.ACTIVE
    } else {
      newUser.status = UserStatus.PENDING

      // Send notification email to admin
      await this.mailService.sendNewAgentNotification(newUser)
    }

    return newUser.save()
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec()
  }

  async findAllAgents(): Promise<User[]> {
    return this.userModel.find({ role: UserRole.AGENT }).sort({ createdAt: -1 }).exec()
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec()
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return user
  }

  async findById(id: string): Promise<User> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<User> {
    return this.userModel.findOne({ email }).exec()
  }

  async update(id: string, updateUserDto: UpdateUserDto, updaterId: string): Promise<User> {
    const userToUpdate = await this.userModel.findById(id).exec();
    if (!userToUpdate) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // IMPORTANT: No password or confirmPassword logic here.
    // This method ONLY handles updating non-password profile details.

    if (updateUserDto.name !== undefined) userToUpdate.name = updateUserDto.name;
    if (updateUserDto.email !== undefined) {
        // Check for duplicate email if changing
        if (userToUpdate.email !== updateUserDto.email) {
            const existingUserWithEmail = await this.userModel.findOne({ email: updateUserDto.email }).exec();
            if (existingUserWithEmail && existingUserWithEmail._id.toString() !== id) {
                throw new ConflictException('Email already in use by another user.');
            }
        }
        userToUpdate.email = updateUserDto.email;
    }
    if (updateUserDto.phoneNumber !== undefined) userToUpdate.phoneNumber = updateUserDto.phoneNumber;
    if (updateUserDto.companyName !== undefined) userToUpdate.companyName = updateUserDto.companyName;
    if (updateUserDto.companyWebsite !== undefined) userToUpdate.companyWebsite = updateUserDto.companyWebsite;
    if (updateUserDto.country !== undefined) userToUpdate.country = updateUserDto.country;
    
    // Role can be updated here by ADMIN
    if (updateUserDto.role !== undefined) userToUpdate.role = updateUserDto.role;
    // Status is still handled by updateAgentStatus, not this general update.
    // So, we don't expect updateUserDto.status to be passed here for updates.


    // Set who updated the user
    if (updaterId) {
        userToUpdate['updatedBy'] = updaterId as any; // Assuming 'updatedBy' field in User schema
    }

    try {
        return await userToUpdate.save();
    } catch (error) {
        if (error.code === 11000) {
            throw new ConflictException('A user with this email already exists.');
        }
        throw error;
    }
  }

  // NEW: Dedicated method for updating agent status by ADMIN
  async updateAgentStatus(id: string, newStatus: UserStatus, updaterId: string): Promise<User> {
    const agent = await this.userModel.findById(id).exec();

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${id} not found`);
    }

    if (agent.role !== UserRole.AGENT) {
      throw new BadRequestException("User is not an agent. Only agents can have their status toggled.");
    }

    if (!Object.values(UserStatus).includes(newStatus)) {
        throw new BadRequestException(`Invalid status provided: ${newStatus}`);
    }
    
    agent.status = newStatus;
    if (updaterId) {
        agent['updatedBy'] = updaterId as any;
    }

    await agent.save(); // This will trigger the pre-save hook, but won't re-hash password if only status changed.

    // Send relevant email notification
    if (newStatus === UserStatus.ACTIVE) {
        await this.mailService.sendAgentActivationEmail(agent);
    } else if (newStatus === UserStatus.INACTIVE) {
        await this.mailService.sendAgentDeactivationEmail(agent);
    }

    return agent;
  }

  // Remove old activateAgent and deactivateAgent methods.
  // async activateAgent(id: string): Promise<User> { ... }
  // async deactivateAgent(id: string): Promise<User> { ... }

  async remove(id: string): Promise<User> {
    const deletedUser = await this.userModel.findByIdAndDelete(id).exec()

    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }

    return deletedUser
  }

  // Add these two methods back to your UsersService
  async createForgotPasswordToken(email: string): Promise<string> {
    const user = await this.userModel.findOne({ email }).exec()

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`)
    }

    // Generate random token
    const token = crypto.randomBytes(20).toString("hex")

    // Set token and expiration (1 hour)
    user.resetPasswordToken = token
    user.resetPasswordExpires = new Date(Date.now() + 3600000)

    await user.save()

    // Send password reset email
    await this.mailService.sendPasswordResetEmail(user, token)

    return token
  }

  async resetPassword(token: string, password: string, confirmPassword: string): Promise<User> {
    if (password !== confirmPassword) {
      throw new BadRequestException("Passwords do not match")
    }

    const user = await this.userModel
      .findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      })
      .exec()

    if (!user) {
      throw new BadRequestException("Password reset token is invalid or has expired")
    }

    // Update password and clear reset token fields
    user.password = password // The pre-save hook will hash this
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined

    await user.save()

    // Send password change confirmation email
    await this.mailService.sendPasswordChangedEmail(user)

    return user
  }
}