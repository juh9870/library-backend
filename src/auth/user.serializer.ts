import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';

import type { UserDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class UserSerializer extends PassportSerializer {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  serializeUser(
    user: UserDto,
    done: (error: string | null, data: string | null) => void,
  ): void {
    done(null, user.id);
  }

  async deserializeUser(
    userId: string,
    done: (error: string | null, data: UserDto | null) => void,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      return done(
        `Could not deserialize user: user with id ${userId} could not be found`,
        null,
      );
    }

    done(null, user);
  }
}
