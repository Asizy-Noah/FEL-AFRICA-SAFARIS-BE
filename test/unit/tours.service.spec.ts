import { Test, type TestingModule } from "@nestjs/testing"
import { ToursService } from "../../src/modules/tours/tours.service"
import { getModelToken } from "@nestjs/mongoose"
import { Tour } from "../../src/modules/tours/schemas/tour.schema"
import { jest } from "@jest/globals"

describe("ToursService", () => {
  let service: ToursService

  const mockTourModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    populate: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToursService,
        {
          provide: getModelToken(Tour.name),
          useValue: mockTourModel,
        },
      ],
    }).compile()

    service = module.get<ToursService>(ToursService)
  })

  it("should be defined", () => {
    expect(service).toBeDefined()
  })

  // Add more tests as needed
})
