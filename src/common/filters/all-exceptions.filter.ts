import { type ExceptionFilter, Catch, type ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common"
import type { Request, Response } from "express"

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
          ? exception.message
          : "Internal server error"

    // Check if the request accepts HTML
    const isHtmlRequest = request.headers.accept?.includes("text/html")

    if (isHtmlRequest) {
      // For HTML requests, redirect to error page with flash message
      if (request.flash) {
        request.flash("error_msg", typeof message === "string" ? message : "An error occurred")
      }

      // Redirect based on status code
      if (status === 401) {
        return response.redirect("/auth/login")
      } else if (status === 403) {
        return response.redirect("/forbidden")
      } else if (status === 404) {
        return response.redirect("/not-found")
      } else {
        return response.redirect("/error")
      }
    }

    // For API requests, return JSON response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === "string" ? message : "An error occurred",
    })
  }
}
