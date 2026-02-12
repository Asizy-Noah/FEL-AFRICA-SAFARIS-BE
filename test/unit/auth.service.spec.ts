import { Test, type TestingModule } from "@nestjs/testing"
import { AuthService } from "../../src/modules/auth/auth.service"
import { UsersService } from "../../src/modules/users/users.service"
import { JwtService } from "@nestjs/jwt"
import { jest } from "@jest/globals"

jest.mock("bcrypt")

describe("AuthService", () => {
  let service: AuthService

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  }

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  // Add more tests as needed
})
