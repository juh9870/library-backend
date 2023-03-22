import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '../../config/config.service';
import type { UserEntity } from '../../users/entity/user.entity';
import { AuthService } from '../auth.service';
import { TokenEntitySchema } from '../entities/auth.entity';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(private authService: AuthService, configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.JWT_REFRESH_TOKEN_SECRET,
    });
  }

  async validate(payload: unknown): Promise<UserEntity> {
    return this.authService.validatePayload(TokenEntitySchema, payload);
  }
}
