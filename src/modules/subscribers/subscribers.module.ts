import { Module } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { SubscribersService } from "./subscribers.service"
import { SubscribersController } from "./subscribers.controller"
import { Subscriber, SubscriberSchema } from "./schemas/subscriber.schema"
import { MailModule } from "../mail/mail.module"

@Module({
  imports: [MongooseModule.forFeature([{ name: Subscriber.name, schema: SubscriberSchema }]), MailModule],
  controllers: [SubscribersController],
  providers: [SubscribersService],
  exports: [SubscribersService],
})
export class SubscribersModule {}
