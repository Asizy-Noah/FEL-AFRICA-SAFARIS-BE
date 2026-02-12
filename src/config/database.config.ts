import { Injectable } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import type { MongooseModuleOptions } from "@nestjs/mongoose"

@Injectable()
export class DatabaseConfig {
  constructor(private configService: ConfigService) {}

  getMongoConfig(): MongooseModuleOptions {
    return {
      uri: this.configService.get<string>('MONGODB_URI'),
    };
  }
}
