import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler, Logger } from "@nestjs/common"
import type { Observable } from "rxjs"
import { tap } from "rxjs/operators"

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name)

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const { method, url, ip } = request
    const userAgent = request.get("user-agent") || ""
    const userId = request.user?.id || "anonymous"

    const now = Date.now()

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse()
        const delay = Date.now() - now

        this.logger.log(`${method} ${url} ${response.statusCode} ${delay}ms - ${userId} - ${ip} - ${userAgent}`)
      }),
    )
  }
}
