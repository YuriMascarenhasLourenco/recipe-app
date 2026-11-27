import { UserDto } from 'src/application/dtos/user.dto';
export interface AuthInterface {
  validateUser(email: string, password: string): Promise<UserDto | null>;
  login(user: UserDto): Promise<{ access_token: string }>;
}
