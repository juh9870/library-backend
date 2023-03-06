import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { IsAdminGuard } from '../auth/guards/is-admin.guard';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { UserEntity } from './entity/user.entity';
import { UsersService } from './users.service';

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @ApiOperation({ description: 'Returns user by given id' })
  @ApiOkResponse({ type: UserEntity })
  @UseGuards(IsAdminGuard)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserEntity> {
    return this.usersService.findOneOrThrow(id);
  }

  @ApiOperation({ description: 'Returns all users' })
  @ApiOkResponse({ type: UserEntity, isArray: true })
  @UseGuards(IsAdminGuard)
  @Get()
  async findAll(): Promise<UserEntity[]> {
    return this.usersService.getAll();
  }

  @ApiOperation({ description: 'Returns user by given id' })
  @ApiBody({ type: SetPermissionsDto })
  @ApiOkResponse({ type: UserEntity })
  @UseGuards(IsAdminGuard)
  @Put(':id/permissions')
  async setPermissions(
    @Param('id') id: string,
    @Body() data: SetPermissionsDto,
  ): Promise<UserEntity> {
    return this.usersService.setPermissions(id, data);
  }
}
