import { Inject, Injectable } from '@nestjs/common';
import { UserDto } from '../dtos/user.dto';
import { AuthInterface } from 'src/domain/interfaces/auth/auth.interface';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject('AuthInterface') private readonly authService: AuthInterface,
  ) {}

  async execute(user: UserDto): Promise<{ access_token: string }> {
    return await this.authService.login(user);
  }
}
