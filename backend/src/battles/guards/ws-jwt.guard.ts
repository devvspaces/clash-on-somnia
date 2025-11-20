import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        throw new WsException('Missing authentication token');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'your-super-secret-jwt-key',
      });

      // Attach user data to socket for later use
      (client as any).user = {
        userId: payload.sub,
        username: payload.username,
        villageId: payload.villageId,
      };

      return true;
    } catch (error) {
      throw new WsException('Invalid authentication token');
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization;

    if (!token) {
      return null;
    }

    // Handle "Bearer <token>" format
    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      return token.substring(7);
    }

    return token;
  }
}
