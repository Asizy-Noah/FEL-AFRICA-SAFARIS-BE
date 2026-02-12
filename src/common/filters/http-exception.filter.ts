import { type ExceptionFilter, Catch, type ArgumentsHost, HttpException } from "@nestjs/common"
import type { Request, Response } from "express"

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception.getStatus()
    const exceptionResponse = exception.getResponse() as any

    // Check if the request accepts HTML
    const isHtmlRequest = request.headers.accept?.includes("text/html")

    if (isHtmlRequest) {
      // For HTML requests, redirect to error page with flash message
      if (request.flash) {
        request.flash("error_msg", exceptionResponse.message || exception.message)
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
      message: exceptionResponse.message || exception.message,
    })
  }
}
