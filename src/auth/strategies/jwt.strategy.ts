import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '../../config/config.service';
import type { UserEntity } from '../../users/entity/user.entity';
import { AuthService } from '../auth.service';
import { AuthEntity, AuthEntitySchema } from '../entities/auth.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService, configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.JWT_ACCESS_TOKEN_SECRET,
    });
  }

  async validate(payload: unknown): Promise<UserEntity> {
    await this.authService.validateRefreshToken(
      (payload as AuthEntity).refreshHash,
    );
    return this.authService.validatePayload(AuthEntitySchema, payload);
  }
}
