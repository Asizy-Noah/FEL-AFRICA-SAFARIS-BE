import { Test, type TestingModule } from "@nestjs/testing"
import { UsersService } from "../../src/modules/users/users.service"
import { getModelToken } from "@nestjs/mongoose"
import { User } from "../../src/modules/users/schemas/user.schema"
import { jest } from "@jest/globals"

describe("UsersService", () => {
  let service: UsersService

  const mockUserModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile()

    service = module.get<UsersService>(UsersService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  // Add more tests as needed
})
